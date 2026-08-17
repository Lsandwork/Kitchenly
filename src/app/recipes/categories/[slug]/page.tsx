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
    title: `${name} recipes`,
    description: `Browse ${name} recipes starting from your kitchen inventory.`,
    alternates: { canonical: `/recipes/categories/${slug}` },
  };
}

export default async function CategoryRecipesPage({ params }: Params) {
  const { slug } = await params;
  const name = labelFromSlug(slug);
  const user = await requireUser();
  const { cards } = await matchKitchenRecipes(user.id, {
    query: name,
    diet: slug.includes("protein") ? "high-protein" : undefined,
    maxMinutes: slug.includes("30") ? 30 : slug.includes("15") ? 15 : undefined,
  });
  const filtered = cards.filter((card) => {
    const hay = [card.recipe.mealType, card.recipe.cuisine, ...card.recipe.tags, ...card.recipe.diets]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(name) || hay.includes(slug.replace(/-/g, " "));
  });
  const list = filtered.length ? filtered : cards.slice(0, 12);
  const jsonLd = itemListJsonLd(
    `${name} recipes`,
    `Dishly ${name} recipes.`,
    list.slice(0, 20).map((card) => ({
      name: card.recipe.title,
      url: recipeCanonicalUrl(card.recipe.slug),
    })),
  );

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SectionTitle kicker="Category" title={`${name} recipes`} />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((card) => (
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
      <Link href="/recipes" className="mt-8 inline-flex font-semibold text-[var(--kf-olive)] underline">
        All recipes
      </Link>
    </PageShell>
  );
}
