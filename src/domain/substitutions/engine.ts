import { getIngredient } from "@/domain/ingredients/catalog";
import { SUBSTITUTION_RULES } from "@/domain/substitutions/data";
import type { KitchenItemInput, SubstitutionSuggestion } from "@/domain/types";

function kitchenHas(kitchen: KitchenItemInput[], canonicalId: string) {
  return kitchen.some((item) => item.canonicalId === canonicalId && item.isUsable !== false);
}

function displayName(id: string) {
  return getIngredient(id)?.name ?? id.replace(/-/g, " ");
}

export function findSubstitutions(
  missingCanonicalId: string,
  kitchen: KitchenItemInput[],
  options?: { baking?: boolean; allergies?: string[] },
): SubstitutionSuggestion[] {
  const allergies = new Set(options?.allergies ?? []);
  const baking = options?.baking ?? false;
  const suggestions: SubstitutionSuggestion[] = [];

  for (const rule of SUBSTITUTION_RULES) {
    if (rule.from !== missingCanonicalId) continue;
    if (baking && !rule.safeForBaking) continue;

    const targets = Array.isArray(rule.to) ? rule.to : [rule.to];
    const available = targets.every((id) => {
      if (id === "water") return true;
      const ingredient = getIngredient(id);
      if (ingredient?.allergens.some((allergen) => allergies.has(allergen))) return false;
      return kitchenHas(kitchen, id);
    });
    if (!available) continue;

    suggestions.push({
      original: displayName(rule.from),
      originalCanonicalId: rule.from,
      substitute: targets.map(displayName).join(" + "),
      substituteCanonicalId: targets[0],
      explanation: rule.explanation,
      flavorImpact: rule.flavorImpact,
      safeForBaking: rule.safeForBaking,
    });
  }

  return suggestions;
}

export function bestSubstitution(
  missingCanonicalId: string,
  kitchen: KitchenItemInput[],
  options?: { baking?: boolean; allergies?: string[] },
) {
  return findSubstitutions(missingCanonicalId, kitchen, options)[0] ?? null;
}
