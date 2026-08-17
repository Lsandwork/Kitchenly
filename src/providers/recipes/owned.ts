import { OWNED_RECIPES } from "@/data/owned-recipes";
import { normalizeIngredientName } from "@/domain/ingredients/normalize";
import type { RecipeRecord } from "@/domain/types";
import type { RecipeSource } from "@/providers/recipes/types";

export class OwnedRecipeSource implements RecipeSource {
  id = "owned";
  name = "Dishly";

  available() {
    return true;
  }

  async search(query: { ingredients: string[]; cuisine?: string; mealType?: string; text?: string }) {
    const wanted = new Set(
      query.ingredients.map((name) => normalizeIngredientName(name).canonicalId).filter(Boolean),
    );
    const text = query.text?.toLowerCase();
    return OWNED_RECIPES.filter((recipe) => {
      if (query.cuisine && recipe.cuisine !== query.cuisine) return false;
      if (text) {
        const hay = `${recipe.title} ${recipe.description} ${recipe.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(text) && !recipe.ingredients.some((item) => item.name.toLowerCase().includes(text))) {
          return false;
        }
      }
      if (!wanted.size) return true;
      return recipe.ingredients.some((item) => item.canonicalId && wanted.has(item.canonicalId));
    });
  }
}

export function allOwnedRecipes(): RecipeRecord[] {
  return OWNED_RECIPES;
}
