import { OwnedRecipeSource } from "@/providers/recipes/owned";
import { SpoonacularSource } from "@/providers/recipes/spoonacular";
import { TheMealDbSource } from "@/providers/recipes/themealdb";
import type { RecipeRecord } from "@/domain/types";
import { logger } from "@/lib/logger";

const sources = [new OwnedRecipeSource(), new TheMealDbSource(), new SpoonacularSource()];

export function availableRecipeSources() {
  return sources.filter((source) => source.available()).map((source) => ({ id: source.id, name: source.name }));
}

export async function retrieveRecipes(query: {
  ingredients: string[];
  cuisine?: string;
  mealType?: string;
  text?: string;
}): Promise<RecipeRecord[]> {
  const usable = sources.filter((source) => source.available());
  const settled = await Promise.allSettled(usable.map((source) => source.search(query)));
  const recipes: RecipeRecord[] = [];
  const seen = new Set<string>();
  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.warn("recipe_source.failed", { source: usable[index].id, error: String(result.reason) });
      return;
    }
    for (const recipe of result.value) {
      const key = recipe.sourceUrl || recipe.id;
      if (seen.has(key)) continue;
      seen.add(key);
      recipes.push(recipe);
    }
  });
  return recipes;
}
