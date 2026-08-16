import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { itemListJsonLd, recipeCanonicalUrl } from "@/lib/recipe-seo";
import { RecipeCardLink } from "@/components/recipes/recipe-card-link";
import { PageShell, SectionTitle } from "@/components/ui";
import { matchKitchenRecipes } from "@/services/recipes";

type Params = { params: Promise<{ slug: string }> };

function labelFromSlug(slug: string) {
  return slug.replace(/-/g, " ");
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const name = labelFromSlug(slug);
  return {
    title: `Recipes with ${name} | Kitchen Friend`,
    description: `Cook with ${name} using what you already have in your kitchen.`,
    alternates: { canonical: `/recipes/ingredients/${slug}` },
  };
}

export default async function IngredientRecipesPage({ params }: Params) {
  const { slug } = await params;
  const name = labelFromSlug(slug);
  const user = await requireUser();
  const { cards } = await matchKitchenRecipes(user.id, { query: name });
  const filtered = cards.filter((card) =>
    card.recipe.ingredients.some(
      (item) => item.canonicalId === slug || item.name.toLowerCase().includes(name),
    ),
  );
  const jsonLd = itemListJsonLd(
    `Recipes with ${name}`,
    `Recipes that use ${name}, ranked for your kitchen.`,
    filtered.slice(0, 20).map((card) => ({
      name: card.recipe.title,
      url: recipeCanonicalUrl(card.recipe.slug),
    })),
  );

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SectionTitle kicker="Ingredient" title={`Recipes with ${name}`} body="Matched to your Kitchen when available." />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((card) => (
          <RecipeCardLink
            key={card.recipe.slug}
            card={{
              slug: card.recipe.slug,
              title: card.recipe.title,
              description: card.recipe.description,
              imageUrl: card.recipe.imageUrl,
              totalMinutes: card.recipe.totalMinutes,
              difficulty: card.recipe.difficulty,
              kitchenMatchPercent: card.kitchenMatchPercent,
              why: card.why,
              missingCount: card.match.missing.length,
            }}
          />
        ))}
      </div>
      {!filtered.length ? (
        <p className="mt-8 text-[var(--kf-text-muted)]">
          No strong matches yet.{" "}
          <Link href="/recipes" className="font-semibold text-[var(--kf-olive)] underline">
            Browse all recipes
          </Link>
        </p>
      ) : null}
    </PageShell>
  );
}
