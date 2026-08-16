import type { RecipeRecord, UserPreferences } from "@/domain/types";

export type QualityIssue = {
  code: string;
  message: string;
  severity: "fix" | "warn";
};

const REASONABLE_TEMP = /([3-5]\d{2})\s*°?\s*F|([1-2]\d{2})\s*°?\s*C/;

export function validateRecipe(recipe: RecipeRecord, prefs?: UserPreferences): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const names = recipe.ingredients.map((item) => item.name.toLowerCase());

  if (!recipe.title.trim()) issues.push({ code: "title", message: "Recipe needs a title.", severity: "fix" });
  if (recipe.ingredients.length < 2) {
    issues.push({ code: "ingredients", message: "A recipe needs more than one ingredient.", severity: "fix" });
  }
  if (recipe.steps.length < 2) {
    issues.push({ code: "steps", message: "Walk the cook through at least two real steps.", severity: "fix" });
  }
  if ((recipe.servings ?? 0) < 1 || (recipe.servings ?? 0) > 12) {
    issues.push({ code: "servings", message: "Servings should be a real household number.", severity: "fix" });
  }
  if (recipe.totalMinutes && (recipe.totalMinutes < 5 || recipe.totalMinutes > 240)) {
    issues.push({ code: "time", message: "Cook time looks off.", severity: "warn" });
  }

  for (const step of recipe.steps) {
    if (REASONABLE_TEMP.test(step.instruction)) {
      const f = step.instruction.match(/([3-5]\d{2})\s*°?\s*F/);
      if (f && (Number(f[1]) < 250 || Number(f[1]) > 500)) {
        issues.push({ code: "temp", message: `Temperature in step ${step.order} looks unsafe or implausible.`, severity: "fix" });
      }
    }
  }

  const mentioned = recipe.steps.map((step) => step.instruction.toLowerCase()).join(" ");
  for (const ingredient of recipe.ingredients) {
    if (ingredient.optional || ingredient.importance === "garnish") continue;
    const token = ingredient.name.toLowerCase().split(" ")[0];
    if (token.length > 3 && !mentioned.includes(token) && !mentioned.includes(ingredient.name.toLowerCase())) {
      issues.push({
        code: "unused",
        message: `${ingredient.name} never appears in the steps.`,
        severity: "warn",
      });
    }
  }

  if (prefs?.allergies.length) {
    for (const allergen of recipe.allergens) {
      if (prefs.allergies.includes(allergen)) {
        issues.push({
          code: "allergy",
          message: `Recipe conflicts with a ${allergen} allergy.`,
          severity: "fix",
        });
      }
    }
  }

  if (new Set(names).size !== names.length) {
    issues.push({ code: "dup", message: "Duplicate ingredients should be merged.", severity: "warn" });
  }

  return issues;
}

export function recipePasses(recipe: RecipeRecord, prefs?: UserPreferences) {
  return validateRecipe(recipe, prefs).every((issue) => issue.severity !== "fix");
}
