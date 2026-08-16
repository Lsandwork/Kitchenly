import type { RecipeIngredient, RecipeRecord } from "@/domain/types";

const DONT_SCALE = new Set(["salt", "black-pepper", "chili-flake", "cumin", "paprika", "oregano"]);

export function scaleQuantity(quantity: number | null | undefined, from: number, to: number, canonicalId?: string) {
  if (quantity == null || from <= 0) return quantity ?? null;
  const factor = to / from;
  if (canonicalId && DONT_SCALE.has(canonicalId)) {
    return Number((quantity * Math.sqrt(factor)).toFixed(2));
  }
  const scaled = quantity * factor;
  if (scaled >= 10) return Math.round(scaled);
  if (scaled >= 1) return Number(scaled.toFixed(1));
  return Number(scaled.toFixed(2));
}

export function scaleRecipe(recipe: RecipeRecord, servings: number): RecipeRecord {
  if (servings === recipe.servings) return recipe;
  return {
    ...recipe,
    servings,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      quantity: scaleQuantity(ingredient.quantity, recipe.servings, servings, ingredient.canonicalId),
    })),
  };
}

export function formatIngredient(ingredient: RecipeIngredient) {
  if (ingredient.quantity == null) return ingredient.name;
  const qty = ingredient.quantity;
  const unit = ingredient.unit ? ` ${ingredient.unit}` : "";
  return `${qty}${unit} ${ingredient.name}`;
}
