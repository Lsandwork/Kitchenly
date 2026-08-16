import { OWNED_RECIPES } from "../src/data/owned-recipes";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  for (const recipe of OWNED_RECIPES) {
    await db.recipe.upsert({
      where: { slug: recipe.slug },
      update: {
        title: recipe.title,
        description: recipe.description,
        origin: recipe.origin,
        sourceName: recipe.sourceName ?? "Kitchen Friend",
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
        ingredientsJson: JSON.stringify(recipe.ingredients),
        stepsJson: JSON.stringify(recipe.steps),
        tagsJson: JSON.stringify(recipe.tags),
        leftoverFriendly: Boolean(recipe.leftoverFriendly),
      },
      create: {
        id: recipe.id,
        slug: recipe.slug,
        title: recipe.title,
        description: recipe.description,
        origin: recipe.origin,
        sourceName: recipe.sourceName ?? "Kitchen Friend",
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
        ingredientsJson: JSON.stringify(recipe.ingredients),
        stepsJson: JSON.stringify(recipe.steps),
        tagsJson: JSON.stringify(recipe.tags),
        leftoverFriendly: Boolean(recipe.leftoverFriendly),
      },
    });
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
