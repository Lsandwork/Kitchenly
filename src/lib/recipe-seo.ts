import type { Recipe } from "@prisma/client";
import type { RecipeIngredient, RecipeRecord, RecipeStep } from "@/domain/types";
import { appUrl } from "@/lib/env";
import { dbRecipeToRecord } from "@/services/recipes/mapper";

function isoDuration(minutes?: number | null) {
  if (!minutes || minutes <= 0) return undefined;
  return `PT${minutes}M`;
}

export function recipeCanonicalUrl(slug: string) {
  return `${appUrl()}/recipes/${slug}`;
}

export function recipeJsonLd(recipe: Recipe | RecipeRecord) {
  const record = "ingredientsJson" in recipe ? dbRecipeToRecord(recipe as Recipe) : (recipe as RecipeRecord);
  const row = "seoTitle" in recipe ? (recipe as Recipe) : null;
  const url = recipeCanonicalUrl(record.slug);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: record.title,
    description: record.description,
    url,
    mainEntityOfPage: url,
    author: {
      "@type": "Organization",
      name: record.sourceName || "Dishly",
    },
    recipeYield: `${record.servings} servings`,
    recipeIngredient: record.ingredients.map((item: RecipeIngredient) => {
      const qty = item.quantity != null ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""} ` : "";
      return `${qty}${item.name}`.trim();
    }),
    recipeInstructions: record.steps.map((step: RecipeStep) => ({
      "@type": "HowToStep",
      position: step.order,
      text: step.instruction,
    })),
  };

  if (record.imageUrl) data.image = [record.imageUrl];
  if (row?.publishedAt) data.datePublished = row.publishedAt.toISOString();
  if (row?.updatedAt) data.dateModified = row.updatedAt.toISOString();
  const prep = isoDuration(record.prepMinutes);
  const cook = isoDuration(record.cookMinutes);
  const total = isoDuration(record.totalMinutes);
  if (prep) data.prepTime = prep;
  if (cook) data.cookTime = cook;
  if (total) data.totalTime = total;
  if (record.cuisine) data.recipeCuisine = record.cuisine;
  if (record.mealType) data.recipeCategory = record.mealType;
  if (row && row.ratingCount >= 3 && row.ratingAverage > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(row.ratingAverage.toFixed(1)),
      ratingCount: row.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return data;
}

export function itemListJsonLd(
  name: string,
  description: string,
  items: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}
