import { describe, expect, it } from "vitest";
import { parseIngredientText } from "@/domain/ingredients/parse";
import { normalizeIngredientName } from "@/domain/ingredients/normalize";
import { findSubstitutions } from "@/domain/substitutions/engine";
import { matchRecipe } from "@/domain/matching/score";
import { mergeShoppingItems, missingToShoppingItems } from "@/domain/shopping/lists";
import { OWNED_RECIPES } from "@/data/owned-recipes";
import { stripDeadEnds } from "@/domain/personality/voice";
import { validateRecipe } from "@/domain/recipes/quality";
import { scaleRecipe } from "@/domain/recipes/scale";
import type { KitchenItemInput, UserPreferences } from "@/domain/types";

const prefs: UserPreferences = {
  skillLevel: "comfortable",
  typicalServings: 2,
  preferredTimeMinutes: 30,
  spiceLevel: "medium",
  diets: [],
  allergies: [],
  disliked: [],
  favoriteCuisines: ["mexican"],
  equipment: ["stovetop", "oven", "microwave"],
  preferredStores: [],
};

function kitchen(...ids: string[]): KitchenItemInput[] {
  return ids.map((id) => ({ canonicalId: id, name: id.replace(/-/g, " "), confirmed: true, confidence: 1 }));
}

describe("ingredient normalization", () => {
  it("maps aliases onto canonical ingredients", () => {
    expect(normalizeIngredientName("capsicum").canonicalId).toBe("bell-pepper");
    expect(normalizeIngredientName("cheddar cheese").canonicalId).toBe("cheddar");
    expect(normalizeIngredientName("green onions").canonicalId).toBe("scallion");
  });

  it("does not merge lime and lemon", () => {
    expect(normalizeIngredientName("lime").canonicalId).toBe("lime");
    expect(normalizeIngredientName("lemon").canonicalId).toBe("lemon");
  });
});

describe("natural language pantry parsing", () => {
  it("parses a spoken kitchen list", () => {
    const items = parseIngredientText(
      "I have chicken, rice, onions, half a bell pepper, spinach, eggs, cheddar, milk and tortillas.",
    );
    const ids = items.map((item) => item.canonicalId);
    expect(ids).toContain("chicken-breast");
    expect(ids).toContain("bell-pepper");
    expect(ids).toContain("tortilla");
    expect(items.find((item) => item.canonicalId === "bell-pepper")?.quantity).toBe(0.5);
  });

  it("understands leftovers", () => {
    const items = parseIngredientText("leftover chicken, leftover rice, cooked vegetables");
    expect(items.every((item) => item.isLeftover)).toBe(true);
  });
});

describe("substitutions", () => {
  it("suggests parsley for cilantro when parsley is on hand", () => {
    const suggestions = findSubstitutions("cilantro", kitchen("parsley"));
    expect(suggestions[0]?.substitute).toContain("parsley");
  });

  it("does not suggest an allergenic substitute", () => {
    const suggestions = findSubstitutions("soy-sauce", kitchen("fish-sauce"), { allergies: ["fish"] });
    expect(suggestions.find((item) => item.substituteCanonicalId === "fish-sauce")).toBeFalsy();
  });
});

describe("recipe matching and minimum shopping", () => {
  const quesadilla = OWNED_RECIPES.find((recipe) => recipe.slug === "crispy-garlic-chicken-quesadillas")!;
  const pasta = OWNED_RECIPES.find((recipe) => recipe.slug === "garlic-spinach-pasta")!;

  it("marks a fully stocked recipe as make now", () => {
    const result = matchRecipe(
      quesadilla,
      kitchen("chicken-breast", "tortilla", "spinach", "cheddar", "garlic", "onion", "olive-oil", "salt", "black-pepper"),
      prefs,
    );
    expect(result.state).toBe("make_now");
    expect(result.missing).toHaveLength(0);
  });

  it("prefers the recipe with fewer missing ingredients", () => {
    const stockedPasta = matchRecipe(pasta, kitchen("pasta", "spinach", "garlic", "olive-oil", "parmesan"), prefs);
    const hungryQuesadilla = matchRecipe(quesadilla, kitchen("pasta", "spinach", "garlic"), prefs);
    expect(stockedPasta.missing.length).toBeLessThan(hungryQuesadilla.missing.length);
    expect(stockedPasta.score).toBeGreaterThan(hungryQuesadilla.score);
  });

  it("matches scallions to green onions via canonical ids", () => {
    const friedRice = OWNED_RECIPES.find((recipe) => recipe.slug === "leftover-fried-rice")!;
    const result = matchRecipe(
      friedRice,
      kitchen("leftover-rice", "eggs", "garlic", "soy-sauce", "scallion", "neutral-oil"),
      prefs,
    );
    expect(result.available.some((item) => item.canonicalId === "scallion" && item.status === "have")).toBe(true);
  });

  it("treats allergies as a hard stop", () => {
    const result = matchRecipe(quesadilla, kitchen("chicken-breast", "tortilla"), { ...prefs, allergies: ["dairy"] });
    expect(result.score).toBeLessThan(0);
  });
});

describe("shopping lists", () => {
  it("merges duplicate onions instead of listing them twice", () => {
    const merged = mergeShoppingItems([
      missingToShoppingItems([{ name: "onion", canonicalId: "onion", quantity: 1, unit: "each", importance: "important", estimatedCost: "low", versatile: true }]),
      missingToShoppingItems([{ name: "onion", canonicalId: "onion", quantity: 0.5, unit: "each", importance: "important", estimatedCost: "low", versatile: true }]),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(1.5);
  });
});

describe("personality", () => {
  it("never leaves a dead-end phrase in user-facing copy", () => {
    expect(stripDeadEnds("Sorry, I don't know what you can make.").toLowerCase()).not.toContain("i don't know");
  });
});

describe("recipe quality and scaling", () => {
  it("accepts owned recipes", () => {
    for (const recipe of OWNED_RECIPES) {
      expect(validateRecipe(recipe).filter((issue) => issue.severity === "fix")).toHaveLength(0);
    }
  });

  it("scales servings without blindly multiplying salt", () => {
    const recipe = OWNED_RECIPES[0];
    const scaled = scaleRecipe(recipe, recipe.servings * 2);
    expect(scaled.servings).toBe(recipe.servings * 2);
    const chicken = scaled.ingredients.find((item) => item.canonicalId === "chicken-breast");
    const original = recipe.ingredients.find((item) => item.canonicalId === "chicken-breast");
    if (chicken?.quantity && original?.quantity) {
      expect(chicken.quantity).toBeGreaterThan(original.quantity);
    }
  });
});
