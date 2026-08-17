import type { Metadata } from "next";
import { Suspense } from "react";
import { RecipeDiscovery } from "@/components/recipes/recipe-discovery";

export const metadata: Metadata = {
  title: "Recipes that start with what you have",
  description:
    "Trending social dinners plus recipes matched to your kitchen. Smash burger tacos, creamy Cajun pasta, Kitchen Match, shopping lists, and cooking mode.",
  openGraph: {
    title: "What can we make? | Dishly",
    description: "The best trending recipes — and what you can make with what you already have.",
    type: "website",
  },
};

export default function RecipesPage() {
  return (
    <Suspense fallback={<main className="kf-page py-16 text-[var(--kf-text-muted)]">Loading recipes…</main>}>
      <RecipeDiscovery />
    </Suspense>
  );
}
