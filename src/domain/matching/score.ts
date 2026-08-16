import { DEFAULT_PANTRY_STAPLES, getIngredient } from "@/domain/ingredients/catalog";
import { isCloseMatch } from "@/domain/ingredients/normalize";
import { bestSubstitution } from "@/domain/substitutions/engine";
import type {
  IngredientMatch,
  KitchenItemInput,
  MissingIngredient,
  RankedRecipe,
  RecipeRecord,
  RecipeState,
  SubstitutionSuggestion,
  UserPreferences,
} from "@/domain/types";

const IMPORTANCE_WEIGHT = {
  critical: 1,
  important: 0.75,
  flexible: 0.4,
  garnish: 0.15,
} as const;

const COST_WEIGHT = { low: 1, medium: 2.2, high: 4 } as const;

function assumedStaples(kitchen: KitchenItemInput[]) {
  const ids = new Set(kitchen.map((item) => item.canonicalId));
  return DEFAULT_PANTRY_STAPLES.filter((id) => !ids.has(id));
}

export function kitchenLookup(kitchen: KitchenItemInput[]) {
  const byCanonical = new Map<string, KitchenItemInput>();
  for (const item of kitchen) {
    if (item.isUsable === false) continue;
    const existing = byCanonical.get(item.canonicalId);
    if (!existing) byCanonical.set(item.canonicalId, item);
  }
  return byCanonical;
}

function daysUntil(date?: Date | string | null) {
  if (!date) return null;
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return null;
  return (value.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}

export function perishabilityUrgency(item: KitchenItemInput) {
  if (item.useSoon || item.isLeftover) return 1;
  const days = daysUntil(item.estimatedExpiration);
  if (days !== null && days <= 2) return 1;
  if (days !== null && days <= 4) return 0.7;
  const catalog = getIngredient(item.canonicalId);
  if (catalog?.perishabilityDays && catalog.perishabilityDays <= 4) return 0.45;
  return 0;
}

export type MatchBreakdown = {
  available: IngredientMatch[];
  missing: MissingIngredient[];
  substitutions: SubstitutionSuggestion[];
  coverage: number;
  shoppingBurden: number;
  wasteReduction: number;
  preferenceFit: number;
  timeFit: number;
  equipmentFit: number;
  score: number;
  state: RecipeState;
};

export function matchRecipe(
  recipe: RecipeRecord,
  kitchen: KitchenItemInput[],
  prefs: UserPreferences,
  options?: { treatSubstitutesAsOwned?: boolean },
): MatchBreakdown {
  const treatSubs = options?.treatSubstitutesAsOwned ?? true;
  const owned = kitchenLookup(kitchen);
  const staples = new Set(assumedStaples(kitchen));
  const allergies = new Set(prefs.allergies);
  const disliked = new Set(prefs.disliked.map((name) => name.toLowerCase()));

  if (recipe.allergens.some((allergen) => allergies.has(allergen))) {
    return {
      available: [],
      missing: [],
      substitutions: [],
      coverage: 0,
      shoppingBurden: 99,
      wasteReduction: 0,
      preferenceFit: 0,
      timeFit: 0,
      equipmentFit: 0,
      score: -100,
      state: "almost_there",
    };
  }

  const available: IngredientMatch[] = [];
  const missing: MissingIngredient[] = [];
  const substitutions: SubstitutionSuggestion[] = [];
  let weightedHave = 0;
  let weightedNeed = 0;
  let shoppingBurden = 0;
  let wasteReduction = 0;

  for (const ingredient of recipe.ingredients) {
    const weight = IMPORTANCE_WEIGHT[ingredient.importance];
    weightedNeed += weight;
    const catalog = ingredient.canonicalId ? getIngredient(ingredient.canonicalId) : undefined;
    const direct = ingredient.canonicalId ? owned.get(ingredient.canonicalId) : undefined;
    const close = !direct
      ? [...owned.values()].find((item) => isCloseMatch(ingredient.canonicalId, item.canonicalId))
      : undefined;
    const hit = direct ?? close;

    if (hit) {
      const closeNote =
        close && !direct
          ? `${hit.name} is close enough — not a perfect match, but it'll cook the same.`
          : undefined;
      available.push({
        name: ingredient.name,
        canonicalId: ingredient.canonicalId,
        status: close && !direct ? "close" : "have",
        kitchenName: hit.name,
        note: closeNote,
      });
      weightedHave += weight * (close && !direct ? 0.82 : 1);
      wasteReduction += perishabilityUrgency(hit) * weight;
      continue;
    }

    if (ingredient.canonicalId && staples.has(ingredient.canonicalId) && ingredient.importance !== "critical") {
      available.push({
        name: ingredient.name,
        canonicalId: ingredient.canonicalId,
        status: "have",
        note: "Treating this as a pantry staple.",
      });
      weightedHave += weight * 0.9;
      continue;
    }

    const sub = ingredient.canonicalId
      ? bestSubstitution(ingredient.canonicalId, kitchen, {
          baking: Boolean(recipe.tags.includes("baking")),
          allergies: prefs.allergies,
        })
      : null;

    if (sub) {
      substitutions.push(sub);
      available.push({
        name: ingredient.name,
        canonicalId: ingredient.canonicalId,
        status: "substitute",
        kitchenName: sub.substitute,
        note: sub.explanation,
      });
      if (treatSubs) {
        weightedHave += weight * (sub.flavorImpact === "none" ? 0.95 : 0.8);
      } else {
        missing.push({
          name: ingredient.name,
          canonicalId: ingredient.canonicalId,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          importance: ingredient.importance,
          estimatedCost: catalog?.estimatedCost ?? "medium",
          versatile: Boolean(catalog && catalog.versatility >= 0.75),
        });
        shoppingBurden += COST_WEIGHT[catalog?.estimatedCost ?? "medium"] * weight;
      }
      continue;
    }

    if (ingredient.optional || ingredient.importance === "garnish") {
      available.push({
        name: ingredient.name,
        canonicalId: ingredient.canonicalId,
        status: "missing",
        note: "Nice to have — skip it if you want.",
      });
      weightedHave += weight * 0.65;
      continue;
    }

    missing.push({
      name: ingredient.name,
      canonicalId: ingredient.canonicalId,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      importance: ingredient.importance,
      estimatedCost: catalog?.estimatedCost ?? "medium",
      versatile: Boolean(catalog && catalog.versatility >= 0.75),
    });
    shoppingBurden += COST_WEIGHT[catalog?.estimatedCost ?? "medium"] * weight;
  }

  const coverage = weightedNeed === 0 ? 0 : weightedHave / weightedNeed;
  const time = recipe.totalMinutes ?? 40;
  const timeFit = time <= prefs.preferredTimeMinutes ? 1 : Math.max(0, 1 - (time - prefs.preferredTimeMinutes) / 60);
  const equipmentFit = recipe.equipment.every((item) => prefs.equipment.includes(item)) ? 1 : 0.35;
  const cuisineFit = recipe.cuisine && prefs.favoriteCuisines.includes(recipe.cuisine.toLowerCase()) ? 0.2 : 0;
  const dislikedHit = recipe.ingredients.some((ingredient) => disliked.has(ingredient.name.toLowerCase()));
  const leftoverBonus = recipe.leftoverFriendly && kitchen.some((item) => item.isLeftover) ? 0.15 : 0;
  const dietFit = prefs.diets.every((diet) => recipe.diets.includes(diet)) ? 0.1 : prefs.diets.length ? -0.8 : 0;

  const score =
    coverage * 6 +
    wasteReduction * 1.4 +
    timeFit * 0.7 +
    equipmentFit * 0.5 +
    cuisineFit +
    leftoverBonus +
    dietFit -
    shoppingBurden * 0.55 -
    (recipe.difficulty === "ambitious" && prefs.skillLevel === "beginner" ? 0.8 : 0) -
    (dislikedHit ? 3 : 0);

  let state: RecipeState = "almost_there";
  if (missing.length === 0) state = "make_now";
  else if (missing.length <= 2 && shoppingBurden <= 3.2) state = "almost_there";
  else state = "almost_there";

  return {
    available,
    missing,
    substitutions,
    coverage,
    shoppingBurden,
    wasteReduction,
    preferenceFit: cuisineFit + dietFit,
    timeFit,
    equipmentFit,
    score,
    state,
  };
}

export function toRankedRecipe(
  recipe: RecipeRecord,
  breakdown: MatchBreakdown,
  whyPicked: string,
  explanation: string,
): RankedRecipe {
  return {
    type: recipe.origin === "generated" ? "generated" : "existing",
    state: breakdown.missing.length === 0 ? "make_now" : breakdown.state,
    recipe,
    availableIngredients: breakdown.available,
    missingIngredients: breakdown.missing,
    substitutions: breakdown.substitutions,
    score: breakdown.score,
    explanation,
    whyPicked,
    shoppingBurden: breakdown.shoppingBurden,
  };
}

export function compareForMinimumShopping(a: MatchBreakdown, b: MatchBreakdown) {
  if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length;
  if (a.shoppingBurden !== b.shoppingBurden) return a.shoppingBurden - b.shoppingBurden;
  return b.score - a.score;
}
