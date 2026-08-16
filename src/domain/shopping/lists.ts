import { getIngredient } from "@/domain/ingredients/catalog";
import type { MissingIngredient, RankedRecipe } from "@/domain/types";

export type ShoppingItem = {
  name: string;
  canonicalId?: string;
  quantity?: number | null;
  unit?: string | null;
  status: "need" | "have" | "skip" | "replace";
  substituteFor?: string;
  estimatedCost?: "low" | "medium" | "high";
  versatile?: boolean;
};

function mergeQuantity(a?: number | null, b?: number | null) {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return a + b;
}

export function missingToShoppingItems(missing: MissingIngredient[]): ShoppingItem[] {
  return missing.map((item) => ({
    name: item.name,
    canonicalId: item.canonicalId,
    quantity: item.quantity,
    unit: item.unit,
    status: "need" as const,
    estimatedCost: item.estimatedCost,
    versatile: item.versatile,
  }));
}

export function mergeShoppingItems(lists: ShoppingItem[][]): ShoppingItem[] {
  const merged = new Map<string, ShoppingItem>();
  for (const list of lists) {
    for (const item of list) {
      const key = item.canonicalId ?? item.name.toLowerCase();
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...item });
        continue;
      }
      const sameUnit = !existing.unit || !item.unit || existing.unit === item.unit;
      if (sameUnit) {
        existing.quantity = mergeQuantity(existing.quantity, item.quantity);
        if (!existing.unit) existing.unit = item.unit;
      } else if (item.quantity && existing.quantity) {
        existing.quantity = Math.ceil((existing.quantity + item.quantity) / 1);
        existing.unit = existing.unit ?? item.unit;
      }
    }
  }
  return [...merged.values()];
}

export function shoppingFromRecipes(recipes: RankedRecipe[]) {
  return mergeShoppingItems(recipes.map((recipe) => missingToShoppingItems(recipe.missingIngredients)));
}

export function describeShoppingNeed(items: ShoppingItem[]) {
  if (items.length === 0) return "You already have everything.";
  if (items.length === 1) {
    return `You only need ${items[0].name}.`;
  }
  if (items.length === 2) {
    return `You only need ${items[0].name} and ${items[1].name}.`;
  }
  return `You need ${items.length} things.`;
}

export function ingredientStoreHint(name: string) {
  const id = name.toLowerCase();
  if (id.includes("thai basil") || id.includes("fish sauce") || id.includes("rice noodles")) {
    return ["asian_grocery_store", "supermarket"];
  }
  if (id.includes("cotija") || id.includes("masa") || id.includes("poblano")) {
    return ["hispanic_grocery", "supermarket"];
  }
  if (id.includes("basil") || id.includes("cilantro") || id.includes("lime")) {
    return ["grocery_store", "market"];
  }
  const catalog = getIngredient(id.replace(/\s+/g, "-"));
  if (catalog?.category === "produce") return ["grocery_store", "market"];
  return ["grocery_store", "supermarket"];
}
