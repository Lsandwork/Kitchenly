"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Chip, PageShell, SectionTitle, SurfaceCard } from "@/components/ui";
import { RecipeCardLink, type RecipeCardData } from "@/components/recipes/recipe-card-link";

type Collection = {
  slug: string;
  title: string;
  description: string;
};

type DiscoveryPayload = {
  trending: Array<{
    recipe: RecipeCardData & { slug: string; title: string; description: string; imageUrl?: string | null; totalMinutes?: number | null; difficulty: string };
    kitchenMatchPercent: number;
    why: string;
    trendingReason?: string | null;
    socialScore?: number;
    match: { missing: unknown[] };
  }>;
  madeForYou: DiscoveryPayload["trending"];
  almost: DiscoveryPayload["trending"];
  noStore: DiscoveryPayload["trending"];
  fast: DiscoveryPayload["trending"];
  useSoon: DiscoveryPayload["trending"];
  collections: Collection[];
  kitchenCount: number;
};

const SUGGESTED = ["Chicken", "Spinach", "Rice", "Eggs", "Garlic", "Broccoli"];

function toCard(item: DiscoveryPayload["trending"][number], trending = false): RecipeCardData {
  return {
    slug: item.recipe.slug,
    title: item.recipe.title,
    description: item.recipe.description,
    imageUrl: item.recipe.imageUrl,
    totalMinutes: item.recipe.totalMinutes,
    difficulty: item.recipe.difficulty,
    kitchenMatchPercent: item.kitchenMatchPercent,
    why: item.trendingReason || item.why,
    missingCount: item.match.missing.length,
    trending,
  };
}

function Section({
  title,
  body,
  cards,
}: {
  title: string;
  body?: string;
  cards: RecipeCardData[];
}) {
  if (!cards.length) return null;
  return (
    <section className="space-y-5">
      <SectionTitle title={title} body={body} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <RecipeCardLink key={card.slug} card={card} />
        ))}
      </div>
    </section>
  );
}

export function RecipeDiscovery() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [query, setQuery] = useState(initialQ);
  const [data, setData] = useState<DiscoveryPayload | null>(null);
  const [searchCards, setSearchCards] = useState<RecipeCardData[] | null>(null);
  const [searching, setSearching] = useState(Boolean(initialQ.trim()));
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/recipes")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load recipes");
        return res.json();
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setError("Recipes are taking a moment. Try again shortly.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialQ.trim()) return;
    let cancelled = false;
    void fetch(`/api/recipes?mode=search&q=${encodeURIComponent(initialQ)}`)
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        setSearchCards(
          (payload.cards || []).map(
            (item: {
              recipe: RecipeCardData & { difficulty: string };
              kitchenMatchPercent: number;
              why: string;
              match: { missing: unknown[] };
            }) => ({
              slug: item.recipe.slug,
              title: item.recipe.title,
              description: item.recipe.description,
              imageUrl: item.recipe.imageUrl,
              totalMinutes: item.recipe.totalMinutes,
              difficulty: item.recipe.difficulty,
              kitchenMatchPercent: item.kitchenMatchPercent,
              why: item.why,
              missingCount: item.match.missing.length,
            }),
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialQ]);

  function toggleIngredient(name: string) {
    setIngredients((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
  }

  function findRecipes() {
    const parts = [...ingredients];
    if (custom.trim()) parts.push(custom.trim());
    const q = query.trim() || (parts.length ? `I have ${parts.join(", ")}` : "");
    setSearching(true);
    void fetch(`/api/recipes?mode=search&q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((payload) => {
        setSearchCards(
          (payload.cards || []).map(
            (item: {
              recipe: RecipeCardData & { difficulty: string };
              kitchenMatchPercent: number;
              why: string;
              match: { missing: unknown[] };
            }) => ({
              slug: item.recipe.slug,
              title: item.recipe.title,
              description: item.recipe.description,
              imageUrl: item.recipe.imageUrl,
              totalMinutes: item.recipe.totalMinutes,
              difficulty: item.recipe.difficulty,
              kitchenMatchPercent: item.kitchenMatchPercent,
              why: item.why,
              missingCount: item.match.missing.length,
            }),
          ),
        );
      })
      .catch(() => setError("Search didn’t land. Try again."))
      .finally(() => setSearching(false));
  }

  return (
    <PageShell>
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--kf-border)] bg-[linear-gradient(145deg,#fff8ef_0%,#f3ebe0_45%,#e8f0e3_100%)] px-4 py-7 shadow-[var(--kf-shadow-hero)] md:rounded-[36px] md:px-12 md:py-14">
        <p className="kf-eyebrow">Recipes</p>
        <h1 className="display mt-2 max-w-3xl text-[2.35rem] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--kf-espresso)] md:mt-3 md:text-6xl">
          What can we make?
        </h1>
        <p className="mt-3 max-w-2xl text-base text-[var(--kf-text-muted)] md:mt-4 md:text-xl">Start with what you already have.</p>

        <div className="mt-6 space-y-4 md:mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--kf-olive)]">What do you have?</p>
          <div className="kf-h-scroll md:flex md:flex-wrap md:overflow-visible">
            {SUGGESTED.map((name) => (
              <Chip key={name} active={ingredients.includes(name)} onClick={() => toggleIngredient(name)}>
                {name}
              </Chip>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <input
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="+ Add ingredient"
              className="min-h-14 w-full rounded-full border border-[var(--kf-border-strong)] bg-[var(--kf-surface-elevated)] px-5 text-base outline-none focus:border-[var(--kf-olive)]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Or ask: "cheap dinner for four"'
              className="min-h-14 w-full rounded-full border border-[var(--kf-border-strong)] bg-[var(--kf-surface-elevated)] px-5 text-base outline-none focus:border-[var(--kf-olive)]"
              onKeyDown={(event) => {
                if (event.key === "Enter") findRecipes();
              }}
            />
            <Button tone="olive" className="min-h-14 w-full px-8 md:w-auto" onClick={findRecipes} disabled={searching}>
              Find recipes
            </Button>
          </div>
          {data ? (
            <p className="text-sm text-[var(--kf-text-muted)]">
              {data.kitchenCount > 0
                ? `Using ${data.kitchenCount} items from your Kitchen.`
                : "No Kitchen saved yet — pick ingredients above or "}
              {data.kitchenCount === 0 ? (
                <Link href="/scan" className="font-semibold text-[var(--kf-olive)] underline">
                  scan your fridge
                </Link>
              ) : null}
            </p>
          ) : null}
        </div>
      </section>

      {error ? (
        <SurfaceCard className="mt-8 p-5 text-[var(--kf-terracotta)]">{error}</SurfaceCard>
      ) : null}

      {searchCards ? (
        <section className="mt-12 space-y-5">
          <div className="flex items-end justify-between gap-4">
            <SectionTitle title="Matches" body={`${searchCards.length} recipes for what you asked.`} />
            <Button tone="ghost" onClick={() => setSearchCards(null)}>
              Clear
            </Button>
          </div>
          {searchCards.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {searchCards.map((card) => (
                <RecipeCardLink key={card.slug} card={card} />
              ))}
            </div>
          ) : (
            <SurfaceCard className="p-8 text-center">
              <p className="display text-3xl">No recipe matches</p>
              <p className="mt-2 text-[var(--kf-text-muted)]">Try fewer filters, or add what’s in your Kitchen.</p>
              <ButtonLinkish href="/kitchen" />
            </SurfaceCard>
          )}
        </section>
      ) : null}

      {!data && !error ? (
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-[28px] bg-[color-mix(in_srgb,var(--kf-background-deep)_70%,white)]" />
          ))}
        </div>
      ) : null}

      {data && !searchCards ? (
        <div className="mt-8 space-y-10 md:mt-14 md:space-y-16">
          <Section
            title="Trending on social"
            body="The dinners dominating TikTok, Instagram, and Pinterest — ranked for what’s actually cooking right now."
            cards={data.trending.map((item) => toCard(item, true))}
          />
          <Section title="Made for your kitchen" body="Ranked from what you actually have." cards={data.madeForYou.map((item) => toCard(item))} />
          <Section title="Use these first" body="Prioritizing ingredients that shouldn’t wait." cards={data.useSoon.map((item) => toCard(item))} />
          <Section title="No store trip" body="Everything is already in your Kitchen." cards={data.noStore.map((item) => toCard(item))} />
          <Section title="Almost there" body="Missing only one or two things." cards={data.almost.map((item) => toCard(item))} />
          <Section title="Dinner in 20 minutes" cards={data.fast.map((item) => toCard(item))} />

          <section className="space-y-4 md:space-y-5">
            <SectionTitle title="Collections" body="Useful dinner paths — not thin SEO filler." />
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {data.collections.map((collection) => (
                <Link
                  key={collection.slug}
                  href={`/recipes/${collection.slug}`}
                  className="rounded-[22px] border border-[var(--kf-border)] bg-[var(--kf-surface-elevated)] p-4 shadow-[var(--kf-shadow-subtle)] transition active:scale-[0.99] md:rounded-[24px] md:p-5 md:hover:-translate-y-0.5 md:hover:shadow-[var(--kf-shadow-card)]"
                >
                  <h3 className="display text-xl font-semibold md:text-2xl">{collection.title}</h3>
                  <p className="mt-1.5 text-sm text-[var(--kf-text-muted)] md:mt-2 md:text-base">{collection.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <SurfaceCard className="flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="kf-eyebrow">Meal plan</p>
              <h2 className="display text-3xl font-semibold">Plan the week, shop once</h2>
            </div>
            <Link href="/recipes/plan" className="inline-flex min-h-12 items-center rounded-full bg-[var(--kf-olive)] px-5 font-semibold text-white">
              Open meal plan
            </Link>
          </SurfaceCard>
        </div>
      ) : null}
    </PageShell>
  );
}

function ButtonLinkish({ href }: { href: string }) {
  return (
    <Link href={href} className="mt-4 inline-flex min-h-12 items-center rounded-full bg-[var(--kf-olive)] px-5 font-semibold text-white">
      Open Kitchen
    </Link>
  );
}
