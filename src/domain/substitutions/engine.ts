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
  options?: { baking?: boolean; allergies?: string[]; requireOwned?: boolean },
): SubstitutionSuggestion[] {
  const allergies = new Set(options?.allergies ?? []);
  const baking = options?.baking ?? false;
  const requireOwned = options?.requireOwned ?? true;
  const suggestions: SubstitutionSuggestion[] = [];

  for (const rule of SUBSTITUTION_RULES) {
    if (rule.from !== missingCanonicalId) continue;
    if (baking && !rule.safeForBaking) continue;

    const targets = Array.isArray(rule.to) ? rule.to : [rule.to];
    const allergyHit = targets.some((id) => {
      const ingredient = getIngredient(id);
      return ingredient?.allergens.some((allergen) => allergies.has(allergen));
    });
    if (allergyHit) continue;

    const owned = targets.every((id) => {
      if (id === "water") return true;
      return kitchenHas(kitchen, id);
    });
    if (requireOwned && !owned) continue;

    suggestions.push({
      original: displayName(rule.from),
      originalCanonicalId: rule.from,
      substitute: targets.map(displayName).join(" + "),
      substituteCanonicalId: targets[0],
      explanation: owned
        ? `${rule.explanation} You already have ${targets.map(displayName).join(" + ")}.`
        : rule.explanation,
      flavorImpact: rule.flavorImpact,
      safeForBaking: rule.safeForBaking,
    });
  }

  return suggestions.sort((a, b) => {
    const aOwned = a.substituteCanonicalId && kitchenHas(kitchen, a.substituteCanonicalId) ? 0 : 1;
    const bOwned = b.substituteCanonicalId && kitchenHas(kitchen, b.substituteCanonicalId) ? 0 : 1;
    return aOwned - bOwned;
  });
}

export function listAllSubstitutions(
  missingCanonicalId: string,
  kitchen: KitchenItemInput[],
  options?: { baking?: boolean; allergies?: string[] },
) {
  return findSubstitutions(missingCanonicalId, kitchen, { ...options, requireOwned: false });
}

export function bestSubstitution(
  missingCanonicalId: string,
  kitchen: KitchenItemInput[],
  options?: { baking?: boolean; allergies?: string[] },
) {
  return findSubstitutions(missingCanonicalId, kitchen, options)[0] ?? null;
}
