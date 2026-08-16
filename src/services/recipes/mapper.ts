import type { Recipe } from "@prisma/client";
import type { RecipeIngredient, RecipeRecord, RecipeStep } from "@/domain/types";

export function dbRecipeToRecord(recipe: Recipe): RecipeRecord {
  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    origin: recipe.origin as RecipeRecord["origin"],
    sourceName: recipe.sourceName,
    sourceUrl: recipe.sourceUrl,
    sourceId: recipe.sourceId,
    imageUrl: recipe.imageUrl,
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    totalMinutes: recipe.totalMinutes,
    difficulty: recipe.difficulty as RecipeRecord["difficulty"],
    cuisine: recipe.cuisine,
    mealType: recipe.mealType as RecipeRecord["mealType"],
    diets: JSON.parse(recipe.dietsJson || "[]"),
    allergens: JSON.parse(recipe.allergensJson || "[]"),
    equipment: JSON.parse(recipe.equipmentJson || "[]"),
    ingredients: JSON.parse(recipe.ingredientsJson || "[]") as RecipeIngredient[],
    steps: JSON.parse(recipe.stepsJson || "[]") as RecipeStep[],
    tags: JSON.parse(recipe.tagsJson || "[]"),
    leftoverFriendly: recipe.leftoverFriendly,
  };
}

export function recipeToSeedData(recipe: RecipeRecord) {
  return {
    title: recipe.title,
    subtitle: null as string | null,
    description: recipe.description,
    seoTitle: `${recipe.title} | Kitchen Friend`,
    seoDescription: recipe.description.slice(0, 155),
    origin: recipe.origin,
    sourceName: recipe.sourceName ?? "Kitchen Friend",
    sourceUrl: recipe.sourceUrl ?? null,
    sourceId: recipe.sourceId ?? null,
    imageUrl: recipe.imageUrl ?? null,
    status: "published",
    publishedAt: new Date(),
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes ?? null,
    cookMinutes: recipe.cookMinutes ?? null,
    totalMinutes: recipe.totalMinutes ?? null,
    difficulty: recipe.difficulty,
    cuisine: recipe.cuisine ?? null,
    mealType: recipe.mealType ?? null,
    dietsJson: JSON.stringify(recipe.diets),
    allergensJson: JSON.stringify(recipe.allergens),
    equipmentJson: JSON.stringify(recipe.equipment),
    cookingMethodsJson: JSON.stringify(
      recipe.equipment.includes("air-fryer")
        ? ["air-fryer"]
        : recipe.tags.includes("one-pan") || recipe.tags.includes("sheet-pan")
          ? ["one-pan"]
          : ["skillet"],
    ),
    ingredientsJson: JSON.stringify(recipe.ingredients),
    stepsJson: JSON.stringify(recipe.steps),
    tagsJson: JSON.stringify(recipe.tags),
    tipsJson: JSON.stringify(recipe.steps.map((step) => step.tip).filter(Boolean)),
    leftoverFriendly: Boolean(recipe.leftoverFriendly),
    storageInstructions: recipe.leftoverFriendly
      ? "Cool, then refrigerate in a sealed container for up to 3 days."
      : null,
    leftoverInstructions: recipe.leftoverFriendly
      ? "Reheat gently. Or turn leftovers into wraps, bowls, or fried rice."
      : null,
  };
}
