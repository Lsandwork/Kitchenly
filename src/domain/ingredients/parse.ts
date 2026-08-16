import { normalizeIngredientName } from "@/domain/ingredients/normalize";
import type { KitchenItemInput, KitchenLocation } from "@/domain/types";

const QUANTITY = /^(about|around|approximately|approx\.?)?\s*(\d+(?:\.\d+)?|\d+\/\d+|half|a|an|one|two|three|four|five|six|couple|few)\s*(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|kg|ml|l|cloves?|bunch(?:es)?|cans?|slices?|pieces?)?/i;

const NUMBER_WORDS: Record<string, number> = {
  half: 0.5,
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  couple: 2,
  few: 3,
};

function parseNumber(raw: string) {
  if (raw.includes("/")) {
    const [n, d] = raw.split("/").map(Number);
    if (n && d) return n / d;
  }
  if (raw in NUMBER_WORDS) return NUMBER_WORDS[raw];
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function splitList(text: string) {
  return text
    .replace(/\band\b/gi, ",")
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseIngredientPhrase(phrase: string): KitchenItemInput {
  const leftover = /\bleftover|\bcooked\b|\bfrom last night\b/i.test(phrase);
  const useSoon = /\buse (this )?soon\b|\bexpir|\bwilt|\bsad\b/i.test(phrase);
  let working = phrase.replace(/\bleftover\b|\bcooked\b|\bfrom last night\b/gi, "").trim();

  let quantity: number | undefined;
  let unit: string | undefined;
  let quantityNote: string | undefined;
  const match = working.match(QUANTITY);
  if (match && match.index === 0) {
    quantity = parseNumber(match[2]);
    unit = match[3]?.toLowerCase();
    working = working.slice(match[0].length).trim();
    if (/about|around|approximately|approx/i.test(match[1] || phrase)) {
      quantityNote = `approximately ${match[2]}${unit ? ` ${unit}` : ""}`;
    }
  }

  const normalized = normalizeIngredientName(working || phrase);
  return {
    canonicalId: normalized.canonicalId ?? `raw:${normalized.displayName.toLowerCase()}`,
    name: normalized.displayName,
    quantity: quantity ?? null,
    unit: unit ?? null,
    quantityNote: quantityNote ?? null,
    isLeftover: leftover,
    isCooked: leftover,
    useSoon,
    confidence: normalized.canonicalId ? Math.max(normalized.confidence, 0.7) : 0.45,
    source: "manual",
    confirmed: true,
  };
}

export function parseIngredientText(
  text: string,
  location: KitchenLocation = "unknown",
): KitchenItemInput[] {
  const cleaned = text.replace(/^(i have|i've got|ive got|got some|got|we have)\s+/i, "");
  const parts = splitList(cleaned);
  const items = (parts.length > 1 ? parts : [cleaned.trim() || text.trim()]).map((part) => ({
    ...parseIngredientPhrase(part),
    location,
  }));

  const merged = new Map<string, KitchenItemInput>();
  for (const item of items) {
    const existing = merged.get(item.canonicalId);
    if (!existing) {
      merged.set(item.canonicalId, item);
      continue;
    }
    if (item.quantity && existing.quantity) {
      existing.quantity += item.quantity;
    } else if (item.quantity && !existing.quantity) {
      existing.quantity = item.quantity;
      existing.unit = item.unit;
    }
    existing.isLeftover = existing.isLeftover || item.isLeftover;
    existing.useSoon = existing.useSoon || item.useSoon;
  }
  return [...merged.values()];
}
