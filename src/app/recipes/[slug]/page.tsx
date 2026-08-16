import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { collectionBySlug } from "@/domain/recipes/collections";
import { readSession, requireUser } from "@/lib/auth";
import { itemListJsonLd, recipeCanonicalUrl, recipeJsonLd } from "@/lib/recipe-seo";
import { RecipeDetailClient } from "@/components/recipes/recipe-detail-client";
import { RecipeCardLink } from "@/components/recipes/recipe-card-link";
import { PageShell, SectionTitle, SurfaceCard } from "@/components/ui";
import { getRecipeBySlug, getRecipeDetail, recipeDetailPayload, recipesForCollection } from "@/services/recipes";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const collection = collectionBySlug(slug);
  if (collection) {
    return {
      title: collection.seoTitle,
      description: collection.seoDescription,
      alternates: { canonical: `/recipes/${slug}` },
      openGraph: {
        title: collection.title,
        description: collection.description,
        type: "website",
      },
    };
  }
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return { title: "Recipe not found | Kitchen Friend" };
  const title = recipe.seoTitle || `${recipe.title} | Kitchen Friend`;
  const description = recipe.seoDescription || recipe.description;
  return {
    title,
    description,
    alternates: { canonical: `/recipes/${slug}` },
    openGraph: {
      title: recipe.title,
      description,
      type: "article",
      images: recipe.imageUrl ? [{ url: recipe.imageUrl }] : undefined,
      url: recipeCanonicalUrl(slug),
    },
    twitter: {
      card: "summary_large_image",
      title: recipe.title,
      description,
      images: recipe.imageUrl ? [recipe.imageUrl] : undefined,
    },
  };
}

async function CollectionView({ slug }: { slug: string }) {
  const user = await requireUser();
  const result = await recipesForCollection(user.id, slug);
  if (!result) notFound();
  const { collection, cards } = result;
  const jsonLd = itemListJsonLd(
    collection.title,
    collection.description,
    cards.slice(0, 20).map((card) => ({
      name: card.recipe.title,
      url: recipeCanonicalUrl(card.recipe.slug),
    })),
  );

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="space-y-4 rounded-[36px] border border-[var(--kf-border)] bg-[linear-gradient(145deg,#fff8ef,#eef3e8)] px-6 py-10 md:px-10">
        <p className="kf-eyebrow">Collection</p>
        <h1 className="display text-5xl font-semibold md:text-6xl">{collection.title}</h1>
        <p className="max-w-2xl text-xl text-[var(--kf-text-muted)]">{collection.description}</p>
        <Link href="/recipes" className="inline-flex font-semibold text-[var(--kf-olive)] underline">
          All recipes
        </Link>
      </section>
      {cards.length ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
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
      ) : (
        <SurfaceCard className="mt-10 p-8 text-center">
          <SectionTitle title="No matches yet" body="Add a few Kitchen items or browse all recipes." />
          <Link href="/kitchen" className="mt-4 inline-flex min-h-12 items-center rounded-full bg-[var(--kf-olive)] px-5 font-semibold text-white">
            Open Kitchen
          </Link>
        </SurfaceCard>
      )}
    </PageShell>
  );
}

export default async function RecipeSlugPage({ params }: Params) {
  const { slug } = await params;
  if (collectionBySlug(slug)) {
    return <CollectionView slug={slug} />;
  }
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();
  const jsonLd = recipeJsonLd(recipe);
  // Render the real recipe on the server for anyone who already has a session, so tapping a
  // card paints content immediately instead of a skeleton waiting on a second round trip.
  // Guests without a cookie fall through to the client fetch, which can mint the session.
  const session = await readSession();
  const initialDetail = session
    ? await getRecipeDetail(session.id, slug)
        .then((detail) => (detail ? recipeDetailPayload(detail, session.email) : null))
        .catch(() => null)
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <noscript>
        <main className="mx-auto max-w-3xl px-4 py-10">
          <h1>{recipe.title}</h1>
          <p>{recipe.description}</p>
        </main>
      </noscript>
      <RecipeDetailClient slug={slug} initialDetail={initialDetail} />
    </>
  );
}
