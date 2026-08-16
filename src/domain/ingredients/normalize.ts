import { allIngredients, getIngredient } from "@/domain/ingredients/catalog";
import type { CanonicalIngredient } from "@/domain/types";

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set(["fresh", "dried", "organic", "the", "a", "an", "some", "of", "and"]);

function tokens(value: string) {
  return fold(value)
    .split(" ")
    .filter((token) => token && !STOP.has(token));
}

const aliasIndex = new Map<string, CanonicalIngredient>();

for (const ingredient of allIngredients()) {
  aliasIndex.set(fold(ingredient.name), ingredient);
  aliasIndex.set(fold(ingredient.id.replace(/-/g, " ")), ingredient);
  for (const alias of ingredient.aliases) {
    aliasIndex.set(fold(alias), ingredient);
  }
}

export function normalizeIngredientName(raw: string): {
  ingredient: CanonicalIngredient | null;
  canonicalId?: string;
  displayName: string;
  confidence: number;
} {
  const cleaned = fold(raw);
  if (!cleaned) {
    return { ingredient: null, displayName: raw.trim(), confidence: 0 };
  }

  const exact = aliasIndex.get(cleaned);
  if (exact) {
    return {
      ingredient: exact,
      canonicalId: exact.id,
      displayName: exact.name,
      confidence: 1,
    };
  }

  const rawTokens = tokens(cleaned);
  let best: { ingredient: CanonicalIngredient; score: number } | null = null;

  for (const ingredient of allIngredients()) {
    const names = [ingredient.name, ...ingredient.aliases];
    for (const name of names) {
      const nameTokens = tokens(name);
      const overlap = nameTokens.filter((token) => rawTokens.includes(token)).length;
      const score = overlap / Math.max(nameTokens.length, rawTokens.length, 1);
      if (score >= 0.66 && (!best || score > best.score)) {
        best = { ingredient, score };
      }
    }
  }

  if (best) {
    return {
      ingredient: best.ingredient,
      canonicalId: best.ingredient.id,
      displayName: best.ingredient.name,
      confidence: Number(best.score.toFixed(2)),
    };
  }

  return { ingredient: null, displayName: raw.trim(), confidence: 0.2 };
}

export function sameFamily(a?: string, b?: string) {
  if (!a || !b) return false;
  const left = getIngredient(a);
  const right = getIngredient(b);
  return Boolean(left && right && left.family === right.family);
}

export function isCloseMatch(recipeId?: string, kitchenId?: string) {
  if (!recipeId || !kitchenId) return false;
  if (recipeId === kitchenId) return true;
  return sameFamily(recipeId, kitchenId);
}
