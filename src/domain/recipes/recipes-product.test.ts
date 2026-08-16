import { describe, expect, it } from "vitest";
import { OWNED_RECIPES } from "@/data/owned-recipes";
import { matchRecipe } from "@/domain/matching/score";
import { scaleRecipe, formatIngredient } from "@/domain/recipes/scale";
import { missingToShoppingItems, mergeShoppingItems } from "@/domain/shopping/lists";
import { listAllSubstitutions } from "@/domain/substitutions/engine";
import { buildRecipeEmailHtml, buildRecipeEmailText } from "@/services/email";
import { recipeJsonLd } from "@/lib/recipe-seo";
import type { KitchenItemInput, UserPreferences } from "@/domain/types";

const prefs: UserPreferences = {
  skillLevel: "comfortable",
  typicalServings: 2,
  preferredTimeMinutes: 30,
  spiceLevel: "medium",
  diets: [],
  allergies: [],
  disliked: [],
  favoriteCuisines: [],
  equipment: ["stovetop", "oven"],
  preferredStores: [],
};

function kitchen(ids: string[]): KitchenItemInput[] {
  return ids.map((canonicalId) => ({
    canonicalId,
    name: canonicalId.replace(/-/g, " "),
    isUsable: true,
  }));
}

describe("Kitchen Match for Creamy Garlic Chicken", () => {
  const recipe = OWNED_RECIPES.find((item) => item.slug === "creamy-garlic-chicken")!;

  it("flags cream and parmesan when missing", () => {
    const match = matchRecipe(
      recipe,
      kitchen(["chicken-breast", "garlic", "butter", "spinach", "olive-oil", "salt", "black-pepper"]),
      prefs,
    );
    const missingIds = match.missing.map((item) => item.canonicalId);
    expect(missingIds).toContain("heavy-cream");
    expect(missingIds).toContain("parmesan");
  });

  it("prioritizes greek yogurt substitute when owned", () => {
    const owned = kitchen(["chicken-breast", "garlic", "butter", "spinach", "olive-oil", "salt", "black-pepper", "greek-yogurt"]);
    const options = listAllSubstitutions("heavy-cream", owned, {});
    expect(options.some((item) => item.substituteCanonicalId === "greek-yogurt")).toBe(true);
    expect(options[0]?.explanation.toLowerCase()).toMatch(/already have|greek yogurt/);
  });

  it("shopping list subtracts kitchen and applied cream sub leaves parmesan", () => {
    const match = matchRecipe(
      recipe,
      kitchen(["chicken-breast", "garlic", "butter", "spinach", "olive-oil", "salt", "black-pepper", "greek-yogurt"]),
      prefs,
    );
    const afterSub = match.missing.filter((item) => item.canonicalId !== "heavy-cream");
    const shopping = missingToShoppingItems(afterSub);
    expect(shopping.map((item) => item.canonicalId)).toEqual(["parmesan"]);
  });
});

describe("serving scale and email", () => {
  const recipe = OWNED_RECIPES.find((item) => item.slug === "creamy-garlic-chicken")!;

  it("scales quantities", () => {
    const scaled = scaleRecipe(recipe, 8);
    const cream = scaled.ingredients.find((item) => item.canonicalId === "heavy-cream");
    expect(cream?.quantity).toBe(2);
  });

  it("formats shopping email text", () => {
    const html = buildRecipeEmailHtml({
      to: ["a@b.com"],
      recipe,
      shopping: [{ canonicalId: "parmesan", name: "parmesan", quantity: 0.5, unit: "cup", status: "need" }],
      missing: [{ name: "parmesan" }],
    });
    const text = buildRecipeEmailText({
      to: ["a@b.com"],
      recipe,
      shopping: [{ canonicalId: "parmesan", name: "parmesan", quantity: 0.5, unit: "cup", status: "need" }],
      missing: [{ name: "parmesan" }],
    });
    expect(html).toContain("Creamy Garlic Chicken");
    expect(html).toContain("parmesan");
    expect(text).toContain("Shopping list");
    expect(formatIngredient(recipe.ingredients[0]!)).toMatch(/chicken/i);
  });

  it("merges weekly shopping quantities", () => {
    const merged = mergeShoppingItems([
      [{ canonicalId: "onion", name: "onion", quantity: 1, unit: "each", status: "need" }],
      [{ canonicalId: "onion", name: "onion", quantity: 2, unit: "each", status: "need" }],
    ]);
    expect(merged[0]?.quantity).toBe(3);
  });

  it("builds recipe JSON-LD without fabricating ratings", () => {
    const data = recipeJsonLd(recipe);
    expect(data["@type"]).toBe("Recipe");
    expect(data.aggregateRating).toBeUndefined();
    expect(Array.isArray(data.recipeIngredient)).toBe(true);
  });
});
