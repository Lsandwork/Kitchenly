import { OWNED_RECIPES } from "@/data/owned-recipes";
import { collectionBySlug, CURATED_COLLECTIONS } from "@/domain/recipes/collections";
import { socialScoreFor, socialTrendFor } from "@/domain/recipes/trending";
import { scaleRecipe } from "@/domain/recipes/scale";
import { matchRecipe, type MatchBreakdown } from "@/domain/matching/score";
import { listAllSubstitutions } from "@/domain/substitutions/engine";
import { missingToShoppingItems, mergeShoppingItems } from "@/domain/shopping/lists";
import type { KitchenItemInput, RecipeRecord, UserPreferences } from "@/domain/types";
import { db } from "@/lib/db";
import { getKitchen, getPreferences } from "@/services/kitchen";
import { dbRecipeToRecord, recipeToSeedData } from "@/services/recipes/mapper";

export type MatchedRecipeCard = {
  recipe: RecipeRecord & {
    ratingAverage?: number;
    ratingCount?: number;
    seoTitle?: string | null;
    seoDescription?: string | null;
    subtitle?: string | null;
  };
  match: MatchBreakdown;
  kitchenMatchPercent: number;
  why: string;
  socialScore?: number;
  trendingReason?: string | null;
};

function kitchenToInput(
  items: Awaited<ReturnType<typeof getKitchen>>,
): KitchenItemInput[] {
  return items.map((item) => ({
    canonicalId: item.canonicalId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    quantityNote: item.quantityNote,
    location: item.location as KitchenItemInput["location"],
    category: item.category,
    isStaple: item.isStaple,
    isLeftover: item.isLeftover,
    isCooked: item.isCooked,
    isUsable: item.isUsable,
    useSoon: item.useSoon,
    confidence: item.confidence,
    estimatedExpiration: item.estimatedExpiration,
  }));
}

export async function ensureRecipesSeeded() {
  for (const recipe of OWNED_RECIPES) {
    const data = recipeToSeedData(recipe);
    await db.recipe.upsert({
      where: { slug: recipe.slug },
      update: {
        imageUrl: data.imageUrl,
        title: data.title,
        description: data.description,
        tagsJson: data.tagsJson,
        ingredientsJson: data.ingredientsJson,
        stepsJson: data.stepsJson,
        dietsJson: data.dietsJson,
        allergensJson: data.allergensJson,
        equipmentJson: data.equipmentJson,
        leftoverFriendly: data.leftoverFriendly,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        status: "published",
      },
      create: { id: recipe.id, slug: recipe.slug, ...data },
    });
  }
}

export async function listPublishedRecipes() {
  await ensureRecipesSeeded();
  return db.recipe.findMany({
    where: { status: "published" },
    orderBy: [{ ratingAverage: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getRecipeBySlug(slug: string) {
  await ensureRecipesSeeded();
  return db.recipe.findFirst({ where: { slug, status: "published" } });
}

function whyFor(match: MatchBreakdown, recipe: RecipeRecord) {
  if (match.state === "make_now") {
    if (match.wasteReduction > 0.4) return "You have everything, and it helps use what should go first.";
    return "You already have what you need.";
  }
  if (match.missing.length === 1) return `You're only missing ${match.missing[0].name}.`;
  if (match.missing.length === 2) {
    return `You're almost there — just ${match.missing[0].name} and ${match.missing[1].name}.`;
  }
  if ((recipe.totalMinutes ?? 99) <= 20) return "Fast enough for tonight.";
  return match.available.length ? `You already have ${match.available.length} of the ingredients.` : recipe.description;
}

export function attachMatch(
  recipe: RecipeRecord & { ratingAverage?: number; ratingCount?: number; seoTitle?: string | null; seoDescription?: string | null; subtitle?: string | null },
  kitchen: KitchenItemInput[],
  prefs: UserPreferences,
): MatchedRecipeCard {
  const match = matchRecipe(recipe, kitchen, prefs);
  const trend = socialTrendFor(recipe.slug);
  return {
    recipe,
    match,
    kitchenMatchPercent: Math.round(match.coverage * 100),
    why: whyFor(match, recipe),
    socialScore: socialScoreFor(recipe.slug),
    trendingReason: trend?.reason ?? null,
  };
}

export async function matchKitchenRecipes(userId: string, options?: { query?: string; maxMinutes?: number; diet?: string }) {
  const [rows, kitchenRows, prefs] = await Promise.all([
    listPublishedRecipes(),
    getKitchen(userId),
    getPreferences(userId),
  ]);
  const kitchen = kitchenToInput(kitchenRows);
  let cards = rows.map((row) => {
    const record = dbRecipeToRecord(row);
    return attachMatch(
      {
        ...record,
        ratingAverage: row.ratingAverage,
        ratingCount: row.ratingCount,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        subtitle: row.subtitle,
      },
      kitchen,
      prefs,
    );
  });

  if (options?.maxMinutes) {
    cards = cards.filter((card) => (card.recipe.totalMinutes ?? 999) <= options.maxMinutes!);
  }
  if (options?.diet) {
    cards = cards.filter((card) => card.recipe.diets.includes(options.diet as never));
  }
  if (options?.query?.trim()) {
    const raw = options.query.trim().toLowerCase();
    const intent = parseRecipeSearchIntent(raw);
    if (intent.maxMinutes) {
      cards = cards.filter((card) => (card.recipe.totalMinutes ?? 999) <= intent.maxMinutes!);
    }
    if (intent.healthy) {
      cards = cards.filter(
        (card) =>
          card.recipe.diets.some((diet) => ["vegetarian", "vegan", "high-protein"].includes(diet)) ||
          card.recipe.tags.some((tag) => /healthy|spinach|vegetable/.test(tag)),
      );
    }
    if (intent.cheap) {
      cards = cards.filter((card) => card.recipe.tags.some((tag) => /cheap|budget|bean|egg|rice|pasta/.test(tag)) || (card.recipe.totalMinutes ?? 99) <= 35);
    }
    if (intent.kids) {
      cards = cards.filter((card) => card.recipe.tags.some((tag) => /taco|quesadilla|pasta|egg|chicken/.test(tag)));
    }
    if (intent.noDairy) {
      cards = cards.filter((card) => !card.recipe.allergens.includes("dairy"));
    }
    if (intent.tokens.length) {
      cards = cards.filter((card) => {
        const hay = [
          card.recipe.title,
          card.recipe.description,
          card.recipe.cuisine,
          ...card.recipe.tags,
          ...card.recipe.ingredients.map((item) => item.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return intent.tokens.every((token) => token.length < 2 || hay.includes(token));
      });
    }
  }

  return {
    kitchen,
    prefs,
    cards: cards.sort((a, b) => b.match.score - a.match.score),
  };
}

export async function discoverySections(userId: string) {
  const { cards, kitchen } = await matchKitchenRecipes(userId);
  const useSoonIds = new Set(kitchen.filter((item) => item.useSoon || item.isLeftover).map((item) => item.canonicalId));

  const trending = [...cards]
    .sort((a, b) => (b.socialScore ?? 0) - (a.socialScore ?? 0) || b.match.score - a.match.score)
    .slice(0, 8);
  const madeForYou = cards.filter((card) => card.match.state === "make_now").slice(0, 6);
  const almost = cards.filter((card) => card.match.state === "almost_there").slice(0, 6);
  const noStore = cards.filter((card) => card.match.missing.length === 0).slice(0, 6);
  const fast = cards.filter((card) => (card.recipe.totalMinutes ?? 99) <= 20).slice(0, 6);
  const useSoon = cards
    .filter((card) => card.recipe.ingredients.some((ing) => ing.canonicalId && useSoonIds.has(ing.canonicalId)))
    .slice(0, 6);

  return {
    trending,
    madeForYou,
    almost,
    noStore,
    fast,
    useSoon,
    collections: CURATED_COLLECTIONS,
    kitchenCount: kitchen.length,
  };
}

export async function recipesForCollection(userId: string, slug: string) {
  const collection = collectionBySlug(slug);
  if (!collection) return null;
  const { cards } = await matchKitchenRecipes(userId, {
    maxMinutes: collection.filter.maxMinutes,
    diet: collection.filter.diets?.[0],
  });
  let filtered = cards;
  if (collection.filter.tags?.length) {
    filtered = filtered.filter((card) =>
      collection.filter.tags!.some(
        (tag) =>
          card.recipe.tags.some((item) => item.includes(tag)) ||
          card.recipe.title.toLowerCase().includes(tag) ||
          card.recipe.ingredients.some((ing) => ing.name.includes(tag)),
      ),
    );
  }
  if (collection.filter.leftoverFriendly) {
    filtered = filtered.filter((card) => card.recipe.leftoverFriendly || card.recipe.tags.includes("leftover"));
  }
  if (collection.filter.noStoreTrip) {
    filtered = filtered.filter((card) => card.match.missing.length === 0);
  }
  if (collection.filter.useSoon) {
    const kitchen = (await getKitchen(userId)).filter((item) => item.useSoon);
    const ids = new Set(kitchen.map((item) => item.canonicalId));
    filtered = filtered.filter((card) => card.recipe.ingredients.some((ing) => ing.canonicalId && ids.has(ing.canonicalId)));
  }
  if (collection.filter.mealType) {
    filtered = filtered.filter((card) => card.recipe.mealType === collection.filter.mealType);
  }
  return { collection, cards: filtered };
}

export async function getRecipeDetail(userId: string, slug: string, servings?: number) {
  const row = await getRecipeBySlug(slug);
  if (!row) return null;
  const [kitchenRows, prefs, saved, note, rating] = await Promise.all([
    getKitchen(userId),
    getPreferences(userId),
    db.savedRecipe.findUnique({ where: { userId_recipeId: { userId, recipeId: row.id } } }),
    db.recipeNote.findUnique({ where: { userId_recipeId: { userId, recipeId: row.id } } }),
    db.recipeRating.findUnique({ where: { userId_recipeId: { userId, recipeId: row.id } } }),
  ]);
  let record = dbRecipeToRecord(row);
  if (servings && servings !== record.servings) {
    record = scaleRecipe(record, servings);
  }
  const kitchen = kitchenToInput(kitchenRows);
  const matched = attachMatch(
    {
      ...record,
      ratingAverage: row.ratingAverage,
      ratingCount: row.ratingCount,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      subtitle: row.subtitle,
    },
    kitchen,
    prefs,
  );
  const substitutionMap = Object.fromEntries(
    matched.match.missing
      .filter((item) => item.canonicalId)
      .map((item) => [
        item.canonicalId!,
        listAllSubstitutions(item.canonicalId!, kitchen, { allergies: prefs.allergies }),
      ]),
  );
  return {
    ...matched,
    row,
    saved: Boolean(saved),
    note: note?.content ?? "",
    userRating: rating?.stars ?? null,
    substitutions: substitutionMap,
    shopping: missingToShoppingItems(matched.match.missing),
  };
}

export async function shoppingListForRecipe(userId: string, slug: string, servings?: number) {
  const detail = await getRecipeDetail(userId, slug, servings);
  if (!detail) return null;
  const title = `Shopping — ${detail.recipe.title}`;
  const list = await db.shoppingList.create({
    data: {
      userId,
      title,
      recipeIds: JSON.stringify([detail.recipe.id]),
      items: {
        create: detail.shopping.map((item) => ({
          canonicalId: item.canonicalId,
          name: item.name,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          status: "need",
          storeGroup: "grocery",
        })),
      },
    },
    include: { items: true },
  });
  return { list, shopping: detail.shopping, recipe: detail.recipe, match: detail.match };
}

export async function weeklyShopping(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const entries = await db.mealPlanEntry.findMany({
    where: { userId, date: { gte: start, lt: end }, recipeId: { not: null } },
    include: { recipe: true },
    orderBy: { date: "asc" },
  });
  const prefs = await getPreferences(userId);
  const kitchen = kitchenToInput(await getKitchen(userId));
  const lists = entries
    .filter((entry) => entry.recipe)
    .map((entry) => {
      const record = dbRecipeToRecord(entry.recipe!);
      const scaled = scaleRecipe(record, entry.servings);
      const match = matchRecipe(scaled, kitchen, prefs);
      return missingToShoppingItems(match.missing);
    });
  return {
    entries,
    shopping: mergeShoppingItems(lists),
  };
}

export { kitchenToInput };

function parseRecipeSearchIntent(raw: string) {
  const maxMinutesMatch = raw.match(/(\d+)\s*(?:min|minute)/);
  const stop = new Set([
    "i",
    "have",
    "with",
    "and",
    "for",
    "a",
    "an",
    "the",
    "something",
    "recipe",
    "recipes",
    "dinner",
    "make",
    "me",
    "my",
    "but",
    "no",
    "in",
    "of",
    "to",
    "will",
    "eat",
    "before",
    "it",
    "goes",
    "bad",
    "use",
  ]);
  const tokens = raw
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !stop.has(token) && !/^\d+$/.test(token));
  return {
    tokens,
    maxMinutes: maxMinutesMatch ? Number(maxMinutesMatch[1]) : raw.includes("20 minute") ? 20 : undefined,
    healthy: /healthy|lighter|vegetable/.test(raw),
    cheap: /cheap|budget|under\s*\$?15/.test(raw),
    kids: /kid|kids|family|child/.test(raw),
    noDairy: /no dairy|dairy.free|without dairy/.test(raw),
  };
}
