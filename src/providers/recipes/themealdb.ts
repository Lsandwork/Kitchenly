import { normalizeIngredientName } from "@/domain/ingredients/normalize";
import type { RecipeIngredient, RecipeRecord } from "@/domain/types";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { RecipeSource } from "@/providers/recipes/types";

type MealSummary = { idMeal: string; strMeal: string; strMealThumb: string };
type MealDetail = {
  idMeal: string;
  strMeal: string;
  strCategory: string | null;
  strArea: string | null;
  strInstructions: string | null;
  strMealThumb: string | null;
  strSource: string | null;
  strYoutube: string | null;
  strTags: string | null;
} & Record<string, string | null>;

function baseUrl() {
  const key = env().THEMEALDB_API_KEY || "1";
  return `https://www.themealdb.com/api/json/v1/${key}`;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${baseUrl()}${path}`, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    logger.warn("themealdb.fetch_failed", { path, error: String(error) });
    return null;
  }
}

function mealToRecipe(meal: MealDetail): RecipeRecord {
  const ingredients: RecipeIngredient[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const name = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim();
    if (!name) continue;
    const normalized = normalizeIngredientName(name);
    ingredients.push({
      name,
      canonicalId: normalized.canonicalId,
      importance: i <= 4 ? "critical" : i <= 10 ? "important" : "flexible",
      notes: measure || undefined,
    });
  }
  const steps = (meal.strInstructions ?? "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((instruction, index) => ({ order: index + 1, instruction }));

  const sourceUrl =
    meal.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`;

  return {
    id: `themealdb-${meal.idMeal}`,
    slug: `themealdb-${meal.idMeal}`,
    title: meal.strMeal,
    description: `${meal.strArea ? `${meal.strArea} ` : ""}${meal.strCategory ?? "recipe"} from TheMealDB.`,
    origin: "external",
    sourceName: "TheMealDB",
    sourceUrl,
    imageUrl: meal.strMealThumb,
    servings: 4,
    difficulty: "medium",
    cuisine: meal.strArea?.toLowerCase() ?? null,
    mealType: meal.strCategory?.toLowerCase().includes("breakfast") ? "breakfast" : "dinner",
    diets: [],
    allergens: [],
    equipment: ["stovetop"],
    ingredients,
    steps: steps.length ? steps : [{ order: 1, instruction: "See the original recipe for full method." }],
    tags: (meal.strTags ?? "").split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean),
  };
}

export class TheMealDbSource implements RecipeSource {
  id = "themealdb";
  name = "TheMealDB";

  available() {
    return true;
  }

  async search(query: { ingredients: string[]; cuisine?: string; text?: string }) {
    const recipes: RecipeRecord[] = [];
    const seen = new Set<string>();

    const lookUp = async (id: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      const detail = await getJson<{ meals: MealDetail[] | null }>(`/lookup.php?i=${id}`);
      const meal = detail?.meals?.[0];
      if (meal) recipes.push(mealToRecipe(meal));
    };

    if (query.text) {
      const found = await getJson<{ meals: MealDetail[] | null }>(`/search.php?s=${encodeURIComponent(query.text)}`);
      for (const meal of found?.meals ?? []) recipes.push(mealToRecipe(meal));
    }

    const ingredients = query.ingredients.slice(0, 4);
    await Promise.all(
      ingredients.map(async (ingredient) => {
        const slug = ingredient.replace(/\s+/g, "_");
        const found = await getJson<{ meals: MealSummary[] | null }>(`/filter.php?i=${encodeURIComponent(slug)}`);
        await Promise.all((found?.meals ?? []).slice(0, 5).map((meal) => lookUp(meal.idMeal)));
      }),
    );

    if (query.cuisine) {
      const found = await getJson<{ meals: MealSummary[] | null }>(`/filter.php?a=${encodeURIComponent(query.cuisine)}`);
      await Promise.all((found?.meals ?? []).slice(0, 6).map((meal) => lookUp(meal.idMeal)));
    }

    return recipes;
  }
}
