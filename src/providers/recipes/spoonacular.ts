import { normalizeIngredientName } from "@/domain/ingredients/normalize";
import type { RecipeRecord } from "@/domain/types";
import { env, hasValue } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { RecipeSource } from "@/providers/recipes/types";

type SpoonacularHit = {
  id: number;
  title: string;
  image?: string;
  usedIngredientCount?: number;
  missedIngredientCount?: number;
  missedIngredients?: { name: string }[];
  usedIngredients?: { name: string }[];
  sourceName?: string;
  sourceUrl?: string;
  readyInMinutes?: number;
  servings?: number;
  analyzedInstructions?: { steps?: { number: number; step: string }[] }[];
  extendedIngredients?: { name: string; amount?: number; unit?: string; original?: string }[];
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  cuisines?: string[];
};

export class SpoonacularSource implements RecipeSource {
  id = "spoonacular";
  name = "Spoonacular";

  available() {
    return hasValue(env().SPOONACULAR_API_KEY);
  }

  async search(query: { ingredients: string[]; text?: string }) {
    if (!this.available()) return [];
    const key = env().SPOONACULAR_API_KEY!;
    try {
      const url = query.text
        ? `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query.text)}&addRecipeInformation=true&fillIngredients=true&number=8&apiKey=${key}`
        : `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(query.ingredients.slice(0, 8).join(","))}&number=8&ranking=2&ignorePantry=true&apiKey=${key}`;
      const response = await fetch(url, { next: { revalidate: 1800 } });
      if (!response.ok) {
        logger.warn("spoonacular.search_failed", { status: response.status });
        return [];
      }
      const payload = await response.json();
      const hits: SpoonacularHit[] = Array.isArray(payload) ? payload : payload.results ?? [];
      const detailed = await Promise.all(hits.slice(0, 8).map((hit) => this.hydrate(hit, key)));
      return detailed.filter((recipe): recipe is RecipeRecord => Boolean(recipe));
    } catch (error) {
      logger.warn("spoonacular.error", { error: String(error) });
      return [];
    }
  }

  private async hydrate(hit: SpoonacularHit, key: string): Promise<RecipeRecord | null> {
    let detail = hit;
    if (!hit.extendedIngredients) {
      const response = await fetch(
        `https://api.spoonacular.com/recipes/${hit.id}/information?includeNutrition=false&apiKey=${key}`,
        { next: { revalidate: 3600 } },
      );
      if (response.ok) detail = { ...hit, ...(await response.json()) };
    }
    const sourceUrl = detail.sourceUrl || `https://spoonacular.com/recipes/${hit.id}`;
    const steps =
      detail.analyzedInstructions?.[0]?.steps?.map((step) => ({
        order: step.number,
        instruction: step.step,
      })) ?? [];
    return {
      id: `spoonacular-${hit.id}`,
      slug: `spoonacular-${hit.id}`,
      title: detail.title,
      description: `A published recipe via ${detail.sourceName ?? "Spoonacular"}. Open the source for the original method and attribution.`,
      origin: "external",
      sourceName: detail.sourceName ?? "Spoonacular",
      sourceUrl,
      imageUrl: detail.image,
      servings: detail.servings ?? 4,
      totalMinutes: detail.readyInMinutes,
      difficulty: (detail.readyInMinutes ?? 40) <= 25 ? "easy" : "medium",
      cuisine: detail.cuisines?.[0]?.toLowerCase() ?? null,
      mealType: "dinner",
      diets: [
        ...(detail.vegetarian ? (["vegetarian"] as const) : []),
        ...(detail.vegan ? (["vegan"] as const) : []),
        ...(detail.glutenFree ? (["gluten-free"] as const) : []),
        ...(detail.dairyFree ? (["dairy-free"] as const) : []),
      ],
      allergens: [],
      equipment: ["stovetop"],
      ingredients: (detail.extendedIngredients ?? detail.usedIngredients ?? []).map((ingredient, index) => {
        const name = "original" in ingredient ? ingredient.name : ingredient.name;
        const normalized = normalizeIngredientName(name);
        return {
          name,
          canonicalId: normalized.canonicalId,
          quantity: "amount" in ingredient && typeof ingredient.amount === "number" ? ingredient.amount : undefined,
          unit: "unit" in ingredient && typeof ingredient.unit === "string" ? ingredient.unit : undefined,
          importance: (index < 4 ? "critical" : "important") as "critical" | "important",
        };
      }),
      steps: steps.length
        ? steps
        : [{ order: 1, instruction: `Follow the original recipe at ${sourceUrl}.` }],
      tags: [],
    };
  }
}
