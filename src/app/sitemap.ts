import type { MetadataRoute } from "next";
import { CURATED_COLLECTIONS } from "@/domain/recipes/collections";
import { appUrl } from "@/lib/env";
import { listPublishedRecipes } from "@/services/recipes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/recipes`, changeFrequency: "daily", priority: 0.95 },
    { url: `${base}/scan`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/kitchen`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/shop`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/tonight`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/signup`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/recipes/plan`, changeFrequency: "weekly", priority: 0.5 },
  ];

  let recipes: MetadataRoute.Sitemap = [];
  try {
    const rows = await listPublishedRecipes();
    recipes = rows.map((row) => ({
      url: `${base}/recipes/${row.slug}`,
      lastModified: row.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));
  } catch {
    recipes = [];
  }

  const collections = CURATED_COLLECTIONS.map((collection) => ({
    url: `${base}/recipes/${collection.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...collections, ...recipes];
}
