import { z } from "zod";
import { OWNED_RECIPES } from "@/data/owned-recipes";
import { matchRecipe, toRankedRecipe } from "@/domain/matching/score";
import { recommendSpeech, whySpeech } from "@/domain/personality/voice";
import { recipePasses, validateRecipe } from "@/domain/recipes/quality";
import type { KitchenItemInput, RankedRecipe, RecipeRecord, UserPreferences } from "@/domain/types";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { configuredAI } from "@/providers/ai";
import { retrieveRecipes } from "@/providers/recipes";

const GeneratedSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number(),
  prepMinutes: z.number().optional(),
  cookMinutes: z.number().optional(),
  totalMinutes: z.number().optional(),
  difficulty: z.enum(["easy", "medium", "ambitious"]),
  cuisine: z.string().optional(),
  equipment: z.array(z.string()).default([]),
  diets: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  ingredients: z.array(
    z.object({
      name: z.string(),
      canonicalId: z.string().optional(),
      quantity: z.number().optional(),
      unit: z.string().optional(),
      optional: z.boolean().optional(),
      importance: z.enum(["critical", "important", "flexible", "garnish"]).default("important"),
    }),
  ),
  steps: z.array(
    z.object({
      order: z.number(),
      instruction: z.string(),
      timerSeconds: z.number().optional(),
      tip: z.string().optional(),
    }),
  ),
  substitutions: z.array(z.string()).default([]),
});

export type RecommendOptions = {
  healthier?: boolean;
  faster?: boolean;
  maxMinutes?: number;
  servings?: number;
  noIngredient?: string[];
  cuisine?: string;
  spicy?: boolean;
  kidFriendly?: boolean;
  impressive?: boolean;
  easiest?: boolean;
  leftoverMode?: boolean;
  text?: string;
  mealType?: string;
};

function applyConstraints(recipes: RankedRecipe[], options: RecommendOptions, prefs: UserPreferences) {
  let next = recipes;
  if (options.noIngredient?.length) {
    const blocked = new Set(options.noIngredient.map((name) => name.toLowerCase()));
    next = next.filter(
      (recipe) =>
        !recipe.recipe.ingredients.some((item) => blocked.has(item.name.toLowerCase()) || blocked.has(item.canonicalId ?? "")),
    );
  }
  if (options.faster || options.maxMinutes) {
    const cap = options.maxMinutes ?? Math.min(prefs.preferredTimeMinutes, 25);
    next = [...next].sort((a, b) => (a.recipe.totalMinutes ?? 99) - (b.recipe.totalMinutes ?? 99));
    next = next.filter((recipe) => (recipe.recipe.totalMinutes ?? 99) <= cap + 10);
  }
  if (options.healthier) {
    next = [...next].sort((a, b) => {
      const score = (recipe: RankedRecipe) =>
        (recipe.recipe.diets.includes("high-protein") ? 1 : 0) +
        (recipe.recipe.diets.includes("vegetarian") ? 0.3 : 0) -
        (recipe.recipe.tags.includes("fried") ? 1 : 0);
      return score(b) - score(a);
    });
  }
  if (options.cuisine) {
    const cuisine = options.cuisine.toLowerCase();
    next = next.filter((recipe) => recipe.recipe.cuisine === cuisine);
  }
  if (options.leftoverMode) {
    next = next.filter((recipe) => recipe.recipe.leftoverFriendly || recipe.recipe.tags.includes("leftovers"));
  }
  if (options.easiest) {
    next = next.filter((recipe) => recipe.recipe.difficulty === "easy");
  }
  return next;
}

async function generateRecipe(
  kitchen: KitchenItemInput[],
  prefs: UserPreferences,
  options: RecommendOptions,
): Promise<RecipeRecord | null> {
  const ai = configuredAI();
  if (!ai) return heuristicGenerated(kitchen, prefs, options);

  const payload = {
    kitchen: kitchen.map((item) => ({ name: item.name, quantity: item.quantity, leftover: item.isLeftover, useSoon: item.useSoon })),
    prefs,
    options,
  };

  const generated = await ai.completeStructured({
    task: "reasoning",
    schemaName: "GeneratedRecipe",
    schema: GeneratedSchema,
    messages: [
      {
        role: "system",
        content:
          "Create ONE coherent original recipe from the user's kitchen. Do not dump random ingredients together. Favor flavor logic, texture contrast, and sensible technique. Every ingredient must be in the kitchen or explicitly optional/missing. Respect allergies as hard constraints. Return JSON only.",
      },
      { role: "user", content: JSON.stringify(payload) },
    ],
  });

  let recipe: RecipeRecord = {
    id: `generated-${Date.now()}`,
    slug: `generated-${Date.now()}`,
    title: generated.title,
    description: generated.description,
    origin: "generated",
    sourceName: "Dishly original",
    servings: generated.servings || prefs.typicalServings,
    prepMinutes: generated.prepMinutes,
    cookMinutes: generated.cookMinutes,
    totalMinutes: generated.totalMinutes,
    difficulty: generated.difficulty,
    cuisine: generated.cuisine,
    mealType: "dinner",
    diets: generated.diets as RecipeRecord["diets"],
    allergens: generated.allergens as RecipeRecord["allergens"],
    equipment: (generated.equipment as RecipeRecord["equipment"]) || ["stovetop"],
    ingredients: generated.ingredients,
    steps: generated.steps,
    tags: ["generated"],
  };

  const issues = validateRecipe(recipe, prefs);
  if (issues.some((issue) => issue.severity === "fix")) {
    const repaired = await ai.completeStructured({
      task: "reasoning",
      schemaName: "GeneratedRecipe",
      schema: GeneratedSchema,
      messages: [
        { role: "system", content: "Repair this recipe. Fix the listed issues. Keep it original and coherent." },
        { role: "user", content: JSON.stringify({ recipe, issues }) },
      ],
    });
    recipe = {
      ...recipe,
      title: repaired.title,
      description: repaired.description,
      ingredients: repaired.ingredients,
      steps: repaired.steps,
      servings: repaired.servings,
    };
  }
  if (!recipePasses(recipe, prefs)) return heuristicGenerated(kitchen, prefs, options);
  return recipe;
}

function heuristicGenerated(
  kitchen: KitchenItemInput[],
  prefs: UserPreferences,
  options: RecommendOptions,
): RecipeRecord {
  const names = kitchen.map((item) => item.name);
  const protein = kitchen.find((item) => ["chicken-breast", "chicken-thigh", "eggs", "tofu", "leftover-chicken"].includes(item.canonicalId));
  const green = kitchen.find((item) => ["spinach", "kale", "broccoli"].includes(item.canonicalId));
  const starch = kitchen.find((item) => ["tortilla", "rice", "pasta", "leftover-rice", "bread"].includes(item.canonicalId));
  const title = [protein?.name, green?.name, starch?.name].filter(Boolean).length
    ? `${protein?.name ?? "Kitchen"} ${green?.name ?? ""} ${starch ? "skillet" : "bowl"}`.replace(/\s+/g, " ").replace(/^./, (c) => c.toUpperCase())
    : "Tonight's kitchen skillet";
  const ingredients = kitchen.slice(0, 8).map((item, index) => ({
    name: item.name,
    canonicalId: item.canonicalId,
    importance: (index < 3 ? "critical" : "important") as "critical" | "important",
    quantity: item.quantity,
    unit: item.unit,
  }));
  return {
    id: `generated-local-${Date.now()}`,
    slug: `generated-local`,
    title,
    description: `Built around ${names.slice(0, 4).join(", ") || "what you already have"}.`,
    origin: "generated",
    sourceName: "Dishly original",
    servings: options.servings ?? prefs.typicalServings,
    totalMinutes: options.maxMinutes ?? 25,
    difficulty: "easy",
    cuisine: options.cuisine ?? null,
    mealType: "dinner",
    diets: prefs.diets,
    allergens: [],
    equipment: prefs.equipment.includes("stovetop") ? ["stovetop"] : prefs.equipment.slice(0, 1),
    ingredients,
    steps: [
      { order: 1, instruction: "Set a pan over medium-high heat and film it with oil or butter if you have it." },
      { order: 2, instruction: protein ? `Cook the ${protein.name} until it's done and has some color.` : "Start with the ingredient that takes longest." },
      { order: 3, instruction: green ? `Add garlic if you have it, then the ${green.name} until it just collapses.` : "Add aromatics, then the rest of the vegetables." },
      { order: 4, instruction: starch ? `Tuck it into the ${starch.name} or serve it alongside.` : "Taste for salt and eat it while it's hot." },
    ],
    tags: ["generated"],
  };
}

export async function recommendMeals(
  userId: string,
  kitchen: KitchenItemInput[],
  prefs: UserPreferences,
  options: RecommendOptions = {},
) {
  if (kitchen.length === 0) {
    return {
      pick: null as RankedRecipe | null,
      alternatives: [] as RankedRecipe[],
      all: [] as RankedRecipe[],
      speech: "Okay, kitchen inspection time. Give me a photo of the fridge and I'll figure it out.",
    };
  }

  const ingredientNames = kitchen.map((item) => item.name);
  let retrieved: RecipeRecord[] = [];
  try {
    retrieved = await retrieveRecipes({
      ingredients: ingredientNames,
      cuisine: options.cuisine,
      text: options.text,
      mealType: options.mealType,
    });
  } catch (error) {
    logger.warn("recommend.retrieve_failed", { error: String(error) });
    retrieved = OWNED_RECIPES;
  }
  if (!retrieved.length) retrieved = OWNED_RECIPES;

  const ranked = retrieved
    .map((recipe) => {
      const breakdown = matchRecipe(recipe, kitchen, prefs);
      const rankedRecipe = toRankedRecipe(
        recipe,
        breakdown,
        "",
        "",
      );
      rankedRecipe.whyPicked = whySpeech(rankedRecipe, kitchen);
      rankedRecipe.explanation = rankedRecipe.whyPicked;
      if (breakdown.missing.length === 0) rankedRecipe.state = "make_now";
      else if (breakdown.missing.length <= 2) rankedRecipe.state = "almost_there";
      return { rankedRecipe, breakdown };
    })
    .filter((row) => row.breakdown.score > -20)
    .sort((a, b) => b.breakdown.score - a.breakdown.score);

  let usable = applyConstraints(
    ranked.map((row) => row.rankedRecipe),
    options,
    prefs,
  );

  const makeNow = usable.filter((recipe) => recipe.state === "make_now");
  const almost = usable.filter((recipe) => recipe.state === "almost_there" && recipe.missingIngredients.length <= 2);
  let pick = makeNow[0] ?? almost[0] ?? usable[0] ?? null;

  const strongExisting = Boolean(pick && pick.score >= 3.2 && pick.missingIngredients.length <= 2);
  if (!strongExisting) {
    try {
      const generated = await generateRecipe(kitchen, prefs, options);
      if (generated) {
        await db.generatedRecipe.create({
          data: {
            userId,
            title: generated.title,
            description: generated.description,
            servings: generated.servings,
            prepMinutes: generated.prepMinutes ?? null,
            cookMinutes: generated.cookMinutes ?? null,
            totalMinutes: generated.totalMinutes ?? null,
            difficulty: generated.difficulty,
            cuisine: generated.cuisine ?? null,
            dietsJson: JSON.stringify(generated.diets),
            allergensJson: JSON.stringify(generated.allergens),
            equipmentJson: JSON.stringify(generated.equipment),
            ingredientsJson: JSON.stringify(generated.ingredients),
            stepsJson: JSON.stringify(generated.steps),
            validationJson: JSON.stringify(validateRecipe(generated, prefs)),
          },
        });
        const breakdown = matchRecipe(generated, kitchen, prefs);
        const generatedRanked = toRankedRecipe(generated, breakdown, "I made this one for your kitchen.", "Built around what you actually have.");
        generatedRanked.state = breakdown.missing.length === 0 ? "created_for_you" : "created_for_you";
        generatedRanked.type = "generated";
        usable = [generatedRanked, ...usable];
        if (!pick || pick.missingIngredients.length > generatedRanked.missingIngredients.length) {
          pick = generatedRanked;
        }
      }
    } catch (error) {
      logger.warn("recommend.generate_failed", { error: String(error) });
    }
  }

  const alternatives = usable.filter((recipe) => recipe.recipe.id !== pick?.recipe.id).slice(0, 3);
  const speech = pick ? recommendSpeech(pick, kitchen, alternatives) : "I'm going to work with what you actually have and build something around it.";

  if (pick) {
    await db.recipeMatch.create({
      data: {
        userId,
        state: pick.state,
        score: pick.score,
        explanation: pick.explanation,
        availableJson: JSON.stringify(pick.availableIngredients),
        missingJson: JSON.stringify(pick.missingIngredients),
        substitutionsJson: JSON.stringify(pick.substitutions),
      },
    });
  }

  return { pick, alternatives, all: usable.slice(0, 6), speech };
}

export function serializeRecipe(recipe: RankedRecipe) {
  return {
    type: recipe.type,
    state: recipe.state,
    id: recipe.recipe.id,
    slug: recipe.recipe.slug,
    title: recipe.recipe.title,
    description: recipe.recipe.description,
    origin: recipe.recipe.origin,
    sourceName: recipe.recipe.sourceName,
    sourceUrl: recipe.recipe.sourceUrl,
    imageUrl: recipe.recipe.imageUrl,
    servings: recipe.recipe.servings,
    totalMinutes: recipe.recipe.totalMinutes,
    difficulty: recipe.recipe.difficulty,
    cuisine: recipe.recipe.cuisine,
    whyPicked: recipe.whyPicked,
    explanation: recipe.explanation,
    available: recipe.availableIngredients,
    missing: recipe.missingIngredients,
    substitutions: recipe.substitutions,
    ingredients: recipe.recipe.ingredients,
    steps: recipe.recipe.steps,
    equipment: recipe.recipe.equipment,
    diets: recipe.recipe.diets,
    leftoverFriendly: recipe.recipe.leftoverFriendly,
  };
}
