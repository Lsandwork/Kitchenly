"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, Chip, PageShell, SurfaceCard } from "@/components/ui";
import { formatIngredient } from "@/domain/recipes/scale";

type Ingredient = {
  name: string;
  canonicalId: string;
  quantity?: number | null;
  unit?: string | null;
  optional?: boolean;
  importance?: string;
};

type Step = {
  order: number;
  instruction: string;
  timerSeconds?: number | null;
  tip?: string;
};

type SubOption = {
  original: string;
  substitute: string;
  substituteCanonicalId: string;
  explanation: string;
  flavorImpact: string;
};

type Detail = {
  recipe: {
    id: string;
    slug: string;
    title: string;
    description: string;
    imageUrl?: string | null;
    servings: number;
    prepMinutes?: number | null;
    cookMinutes?: number | null;
    totalMinutes?: number | null;
    difficulty: string;
    cuisine?: string | null;
    mealType?: string | null;
    diets: string[];
    equipment: string[];
    ingredients: Ingredient[];
    steps: Step[];
    tags: string[];
  };
  match: {
    state: string;
    available: { name: string; status: string }[];
    missing: { name: string; canonicalId: string; quantity?: number | null; unit?: string | null }[];
  };
  kitchenMatchPercent: number;
  why: string;
  saved: boolean;
  note: string;
  userRating: number | null;
  substitutions: Record<string, SubOption[]>;
  shopping: { name: string; canonicalId: string; quantity?: number | null; unit?: string | null }[];
  ratingAverage: number;
  ratingCount: number;
  leftoverInstructions?: string | null;
  storageInstructions?: string | null;
  userEmail?: string | null;
};

const SERVINGS = [2, 4, 6, 8];

function plateStyle(title: string) {
  const hue = [18, 32, 92, 140][title.length % 4];
  return {
    background: `radial-gradient(circle at 28% 28%, hsla(${hue},55%,72%,.95), hsla(${hue + 18},32%,26%,.96))`,
  };
}

export function RecipeDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [servings, setServings] = useState(4);
  const [error, setError] = useState("");
  const [speech, setSpeech] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [includeShopping, setIncludeShopping] = useState(true);
  const [note, setNote] = useState("");
  const [ask, setAsk] = useState("");
  const [answer, setAnswer] = useState("");
  const [appliedSubs, setAppliedSubs] = useState<Record<string, string>>({});
  const [shoppingPreview, setShoppingPreview] = useState<Detail["shopping"] | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [leftoverQty, setLeftoverQty] = useState("2");
  const [shareOpen, setShareOpen] = useState(false);

  function load(nextServings = servings) {
    void fetch(`/api/recipes/${slug}?servings=${nextServings}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Recipe not found");
        return res.json();
      })
      .then((payload: Detail) => {
        setDetail(payload);
        setNote(payload.note || "");
        setServings(payload.recipe.servings);
        if (!emails && payload.userEmail) setEmails(payload.userEmail);
      })
      .catch(() => setError("We couldn’t open that recipe."));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function act(action: string, extra?: Record<string, unknown>) {
    const res = await fetch(`/api/recipes/${slug}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, servings, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "That didn’t work");
    return data;
  }

  const effectiveMissing = useMemo(() => {
    if (!detail) return [];
    return detail.match.missing.filter((item) => !appliedSubs[item.canonicalId]);
  }, [detail, appliedSubs]);

  const shoppingItems = shoppingPreview ?? detail?.shopping.filter((item) => !appliedSubs[item.canonicalId]) ?? [];

  if (error) {
    return (
      <PageShell narrow>
        <SurfaceCard className="p-8 text-center">
          <h1 className="display text-4xl">Recipe not found</h1>
          <p className="mt-3 text-[var(--kf-text-muted)]">{error}</p>
          <Link href="/recipes" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[var(--kf-olive)] px-5 font-semibold text-white">
            Back to Recipes
          </Link>
        </SurfaceCard>
      </PageShell>
    );
  }

  if (!detail) {
    return (
      <PageShell>
        <div className="h-[28rem] animate-pulse rounded-[36px] bg-[color-mix(in_srgb,var(--kf-background-deep)_70%,white)]" />
      </PageShell>
    );
  }

  const { recipe, kitchenMatchPercent, why } = detail;
  const canMake = effectiveMissing.length === 0;

  return (
    <PageShell>
      <article className="space-y-8">
        <div className="overflow-hidden rounded-[24px] border border-[var(--kf-border)] bg-[var(--kf-surface-elevated)] shadow-[var(--kf-shadow-hero)] md:rounded-[36px]">
          <div className="relative min-h-[200px] md:min-h-[420px]" style={recipe.imageUrl ? undefined : plateStyle(recipe.title)}>
            {recipe.imageUrl ? (
              <Image src={recipe.imageUrl} alt="" fill priority className="object-cover" sizes="100vw" />
            ) : (
              <div className="absolute inset-0 flex items-end p-5 md:p-12">
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/80">Kitchen Friend recipe</p>
              </div>
            )}
          </div>
          <div className="space-y-4 p-5 md:space-y-5 md:p-10">
            <div className="kf-h-scroll md:flex md:flex-wrap md:overflow-visible">
              <span className="rounded-full bg-[color-mix(in_srgb,var(--kf-olive)_14%,white)] px-3 py-1 text-sm font-bold text-[var(--kf-olive)]">
                {kitchenMatchPercent}% Kitchen Match
              </span>
              {recipe.diets.map((diet) => (
                <span key={diet} className="rounded-full border border-[var(--kf-border-strong)] px-3 py-1 text-sm font-semibold">
                  {diet}
                </span>
              ))}
            </div>
            <h1 className="display text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.03em] md:text-6xl">{recipe.title}</h1>
            <p className="max-w-3xl text-base text-[var(--kf-text-muted)] md:text-xl">{recipe.description}</p>
            <p className="text-base font-semibold text-[var(--kf-espresso)]">
              {recipe.totalMinutes ?? "—"} min total
              {recipe.prepMinutes != null ? ` · ${recipe.prepMinutes} prep` : ""}
              {recipe.cookMinutes != null ? ` · ${recipe.cookMinutes} cook` : ""} · {recipe.difficulty} · Serves {recipe.servings}
              {detail.ratingCount >= 3 ? ` · ${detail.ratingAverage.toFixed(1)}★ (${detail.ratingCount})` : ""}
            </p>
            <p className="text-[var(--kf-olive)]">{why}</p>
            <div className="hidden flex-col gap-3 sm:flex-row md:flex">
              <Button
                tone="olive"
                className="min-h-14 flex-1"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void act("start_cook")
                      .then((data) => {
                        router.push(`/cook/${data.session.id}`);
                      })
                      .catch((err) => setSpeech(err.message));
                  })
                }
              >
                Start Cooking
              </Button>
              <Button
                tone="primary"
                className="min-h-14 flex-1"
                onClick={() => {
                  const el = document.getElementById("can-i-make");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Can I make this?
              </Button>
            </div>
          </div>
        </div>

        {speech ? <SurfaceCard className="p-4 text-[var(--kf-olive)]">{speech}</SurfaceCard> : null}

        <div className="kf-h-scroll gap-2 md:flex md:flex-wrap md:overflow-visible">
          {[
            ["Save", () => void act(detail.saved ? "unsave" : "save").then(() => load())],
            ["Add to meal plan", () => void act("meal_plan").then(() => setSpeech("Added to your meal plan."))],
            ["Add to Tonight", () => void act("add_to_tonight").then((data) => router.push(`/cook/${data.session.id}`))],
            [
              "Generate shopping list",
              () =>
                void act("shopping").then((data) => {
                  setShoppingPreview(data.shopping);
                  setSpeech(data.speech);
                }),
            ],
            ["Email recipe", () => { setIncludeShopping(false); setEmailOpen(true); }],
            ["Email + shopping list", () => { setIncludeShopping(true); setEmailOpen(true); }],
            [
              "Copy shopping list",
              () => {
                const text = [
                  `Shopping List — ${recipe.title}`,
                  "",
                  ...shoppingItems.map((item) => {
                    const qty = item.quantity != null ? ` — ${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : "";
                    return `• ${item.name}${qty}`;
                  }),
                ].join("\n");
                void navigator.clipboard.writeText(text).then(() => setSpeech("Shopping list copied."));
              },
            ],
            ["Share", () => setShareOpen(true)],
            ["Print", () => window.print()],
            [
              "Make It With Mine",
              () =>
                void act("make_with_mine").then((data) => {
                  setSpeech(data.speech);
                  load();
                }),
            ],
            ["Make healthier", () => void act("make_healthier").then((data) => setSpeech(data.speech))],
            ["Make cheaper", () => void act("make_cheaper").then((data) => setSpeech(data.speech))],
            ["Make faster", () => void act("make_faster").then((data) => setSpeech(data.speech))],
            ["Mark cooked", () => setCompleteOpen(true)],
          ].map(([label, onClick]) => (
            <Button key={String(label)} tone="secondary" className="min-h-11" onClick={onClick as () => void}>
              {label as string}
            </Button>
          ))}
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SurfaceCard className="space-y-5 p-6" elevated>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="display text-3xl font-semibold">Ingredients</h2>
              <div className="flex flex-wrap gap-2">
                {SERVINGS.map((value) => (
                  <Chip
                    key={value}
                    active={servings === value}
                    onClick={() => {
                      setServings(value);
                      load(value);
                    }}
                  >
                    {value} servings
                  </Chip>
                ))}
              </div>
            </div>
            <ul className="space-y-3">
              {recipe.ingredients.map((item) => {
                const have = detail.match.available.some((row) => row.name === item.name && row.status !== "missing");
                const missing = detail.match.missing.some((row) => row.canonicalId === item.canonicalId);
                const sub = appliedSubs[item.canonicalId];
                return (
                  <li key={item.canonicalId + item.name} className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--kf-border)] pb-3">
                    <div>
                      <p className="font-semibold">
                        {have || sub ? "✓ " : missing ? "• " : ""}
                        {sub ? `${sub} (for ${item.name})` : formatIngredient({
                          ...item,
                          importance: (item.importance as "critical" | "important" | "flexible" | "garnish") || "flexible",
                        })}
                        {item.optional ? " (optional)" : ""}
                      </p>
                    </div>
                    {missing && !sub ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full bg-[var(--kf-olive)] px-3 py-1.5 text-sm font-bold text-white"
                          disabled={pending}
                          onClick={() =>
                            startTransition(() => {
                              void act("have_ingredient", {
                                missingCanonicalId: item.canonicalId,
                                ingredientName: item.name,
                                location: "pantry",
                              })
                                .then((data) => {
                                  setSpeech(data.speech || `Added ${item.name} to your kitchen.`);
                                  if (data.match) {
                                    setDetail((current) =>
                                      current
                                        ? {
                                            ...current,
                                            match: data.match,
                                            kitchenMatchPercent: data.kitchenMatchPercent,
                                            why: data.why,
                                            shopping: data.shopping ?? current.shopping,
                                            substitutions: data.substitutions ?? current.substitutions,
                                          }
                                        : current,
                                    );
                                  } else {
                                    load(servings);
                                  }
                                })
                                .catch((error: Error) => setSpeech(error.message));
                            })
                          }
                        >
                          I have this
                        </button>
                        <button
                          type="button"
                          className="text-sm font-bold text-[var(--kf-terracotta)]"
                          onClick={() => {
                            const options = detail.substitutions[item.canonicalId] || [];
                            const owned = options.find((option) =>
                              /you already have/i.test(option.explanation),
                            );
                            const pick = owned || options[0];
                            if (pick) {
                              setAppliedSubs((prev) => ({ ...prev, [item.canonicalId]: pick.substitute }));
                              setSpeech(`Using ${pick.substitute} instead of ${item.name}.`);
                            } else {
                              setSpeech(`No great substitute found for ${item.name} yet.`);
                            }
                          }}
                        >
                          Find a sub
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </SurfaceCard>

          <SurfaceCard id="can-i-make" className="space-y-4 p-6" elevated>
            <h2 className="display text-3xl font-semibold">{canMake ? "You can make this." : "You’re almost there."}</h2>
            <p className="text-[var(--kf-text-muted)]">{kitchenMatchPercent}% Kitchen Match · {why}</p>
            {detail.match.available.filter(
              (item) => item.status === "have" || item.status === "close" || item.status === "substitute",
            ).length || Object.keys(appliedSubs).length ? (
              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-[var(--kf-olive)]">You have</p>
                <div className="flex flex-wrap gap-2">
                  {detail.match.available
                    .filter((item) => item.status === "have" || item.status === "close" || item.status === "substitute")
                    .map((item) => (
                      <span
                        key={item.name}
                        className="rounded-full bg-[color-mix(in_srgb,var(--kf-olive)_12%,white)] px-3 py-1 text-sm font-semibold text-[var(--kf-olive)]"
                      >
                        ✓ {item.name}
                      </span>
                    ))}
                  {Object.values(appliedSubs).map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-[color-mix(in_srgb,var(--kf-olive)_12%,white)] px-3 py-1 text-sm font-semibold text-[var(--kf-olive)]"
                    >
                      ✓ {name} (sub)
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--kf-text-muted)]">
                Your kitchen is empty so far. Scan or add ingredients to see what you already have.
              </p>
            )}
            {effectiveMissing.length ? (
              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-[var(--kf-terracotta)]">Missing</p>
                <ul className="space-y-2">
                  {effectiveMissing.map((item) => (
                    <li key={item.canonicalId} className="flex flex-wrap items-center justify-between gap-2">
                      <span>• {item.name}</span>
                      <button
                        type="button"
                        className="rounded-full border border-[var(--kf-olive)] px-3 py-1 text-xs font-bold text-[var(--kf-olive)]"
                        disabled={pending}
                        onClick={() =>
                          startTransition(() => {
                            void act("have_ingredient", {
                              missingCanonicalId: item.canonicalId,
                              ingredientName: item.name,
                              location: "pantry",
                            })
                              .then((data) => {
                                setSpeech(data.speech || `Added ${item.name} to your kitchen.`);
                                if (data.match) {
                                  setDetail((current) =>
                                    current
                                      ? {
                                          ...current,
                                          match: data.match,
                                          kitchenMatchPercent: data.kitchenMatchPercent,
                                          why: data.why,
                                          shopping: data.shopping ?? current.shopping,
                                          substitutions: data.substitutions ?? current.substitutions,
                                        }
                                      : current,
                                  );
                                } else {
                                  load(servings);
                                }
                              })
                              .catch((error: Error) => setSpeech(error.message));
                          })
                        }
                      >
                        I have this
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <Button
                tone="olive"
                onClick={() =>
                  void act("start_cook").then((data) => router.push(`/cook/${data.session.id}`))
                }
              >
                Make it anyway
              </Button>
              <Button
                tone="secondary"
                onClick={() =>
                  void act("shopping").then((data) => {
                    setShoppingPreview(data.shopping);
                    setSpeech(data.speech);
                    router.push("/shop");
                  })
                }
              >
                Add missing items to Shop
              </Button>
              <Button tone="secondary" onClick={() => { setIncludeShopping(true); setEmailOpen(true); }}>
                Email shopping list
              </Button>
              <Link href="/scan" className="text-center text-sm font-semibold text-[var(--kf-olive)] underline">
                Or scan fridge / update Kitchen
              </Link>
            </div>
            {Object.keys(detail.substitutions).length ? (
              <div className="space-y-3 border-t border-[var(--kf-border)] pt-4">
                <h3 className="font-bold">Find substitutes</h3>
                {Object.entries(detail.substitutions).map(([canonicalId, options]) => (
                  <div key={canonicalId} className="rounded-[18px] bg-[var(--kf-background)] p-3">
                    <p className="font-semibold">{options[0]?.original || canonicalId}</p>
                    <ul className="mt-2 space-y-2 text-sm text-[var(--kf-text-muted)]">
                      {options.slice(0, 3).map((option) => (
                        <li key={option.substituteCanonicalId}>
                          <button
                            type="button"
                            className="text-left font-semibold text-[var(--kf-espresso)]"
                            onClick={() => {
                              setAppliedSubs((prev) => ({ ...prev, [canonicalId]: option.substitute }));
                              setSpeech(option.explanation);
                            }}
                          >
                            {option.substitute}
                            {/you already have/i.test(option.explanation) ? " · You already have this" : ""}
                          </button>
                          <span className="block">{option.explanation} · Flavor: {option.flavorImpact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </SurfaceCard>
        </section>

        {shoppingItems.length ? (
          <SurfaceCard className="space-y-3 p-6">
            <h2 className="display text-3xl font-semibold">Shopping list</h2>
            <p className="text-[var(--kf-text-muted)]">Only what you’re still missing after Kitchen + substitutions.</p>
            <ul className="space-y-2">
              {shoppingItems.map((item) => (
                <li key={item.canonicalId} className="font-semibold">
                  □ {item.name}
                  {item.quantity != null ? ` — ${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : ""}
                </li>
              ))}
            </ul>
          </SurfaceCard>
        ) : null}

        <SurfaceCard className="space-y-4 p-6">
          <h2 className="display text-3xl font-semibold">Instructions</h2>
          <ol className="space-y-4">
            {recipe.steps.map((step) => (
              <li key={step.order} className="grid gap-2 border-b border-[var(--kf-border)] pb-4 md:grid-cols-[auto_1fr] md:gap-4">
                <span className="display text-2xl text-[var(--kf-terracotta)]">{step.order}</span>
                <div>
                  <p className="text-lg">{step.instruction}</p>
                  {step.tip ? <p className="mt-1 text-[var(--kf-olive)]">{step.tip}</p> : null}
                  {step.timerSeconds ? (
                    <p className="mt-1 text-sm font-bold text-[var(--kf-espresso)]">
                      Timer: {Math.round(step.timerSeconds / 60)} min (starts in Cooking Mode)
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </SurfaceCard>

        <SurfaceCard className="space-y-4 p-6">
          <h2 className="display text-3xl font-semibold">Ask Kitchen Friend</h2>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (!ask.trim()) return;
              void act("ask", { question: ask })
                .then((data) => {
                  setAnswer(data.answer);
                  setAsk("");
                })
                .catch((err) => setSpeech(err.message));
            }}
          >
            <input
              value={ask}
              onChange={(event) => setAsk(event.target.value)}
              placeholder="Can I use frozen chicken?"
              className="min-h-14 flex-1 rounded-full border border-[var(--kf-border-strong)] bg-white px-5 outline-none"
            />
            <Button type="submit" tone="primary">
              Ask
            </Button>
          </form>
          {answer ? <p className="text-lg text-[var(--kf-espresso)]">{answer}</p> : null}
        </SurfaceCard>

        <SurfaceCard className="space-y-3 p-6">
          <h2 className="display text-3xl font-semibold">Your notes</h2>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Erika loved this. Use less salt next time."
            className="w-full rounded-[20px] border border-[var(--kf-border-strong)] bg-white p-4 outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              tone="secondary"
              onClick={() => void act("note", { content: note }).then(() => setSpeech("Note saved privately."))}
            >
              Save note
            </Button>
            {[5, 4, 3, 2, 1].map((stars) => (
              <Button
                key={stars}
                tone={detail.userRating === stars ? "olive" : "ghost"}
                onClick={() => void act("rate", { stars }).then(() => load())}
              >
                {stars}★
              </Button>
            ))}
          </div>
        </SurfaceCard>

        <div className="flex flex-wrap gap-3">
          <Link href="/recipes/30-minute-meals" className="rounded-full border border-[var(--kf-border-strong)] px-4 py-2 text-sm font-semibold">
            30-Minute Meals
          </Link>
          <Link href="/recipes/no-store-trip" className="rounded-full border border-[var(--kf-border-strong)] px-4 py-2 text-sm font-semibold">
            No Store Trip
          </Link>
          <Link href="/recipes/easy-dinners" className="rounded-full border border-[var(--kf-border-strong)] px-4 py-2 text-sm font-semibold">
            Easy Dinners
          </Link>
          <Link href="/recipes" className="rounded-full border border-[var(--kf-border-strong)] px-4 py-2 text-sm font-semibold">
            All recipes
          </Link>
        </div>
      </article>

      {emailOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4" role="dialog" aria-modal="true">
          <SurfaceCard className="kf-mobile-sheet w-full max-w-lg space-y-4 rounded-none p-5 pb-[calc(1.25rem+var(--kf-safe-bottom))] md:rounded-[var(--kf-radius-lg)] md:p-6 md:pb-6" elevated>
            <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-[var(--kf-border-strong)] md:hidden" />
            <h2 className="display text-3xl font-semibold">Send tonight&apos;s dinner</h2>
            <label className="block space-y-2 text-sm font-semibold">
              Recipients
              <input
                value={emails}
                onChange={(event) => setEmails(event.target.value)}
                placeholder="you@email.com, partner@email.com"
                className="min-h-12 w-full rounded-full border border-[var(--kf-border-strong)] px-4 font-normal outline-none"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={includeShopping} onChange={(event) => setIncludeShopping(event.target.checked)} />
              Include shopping list (Kitchen already subtracted)
            </label>
            <div className="flex gap-2">
              <Button
                tone="olive"
                className="flex-1"
                onClick={() =>
                  void act("email", {
                    emails: emails.split(/[,\s]+/).filter(Boolean),
                    includeShopping,
                    includeRecipe: true,
                    includeIngredients: true,
                    includeInstructions: true,
                    includeMissing: true,
                  })
                    .then((data) => {
                      setSpeech(data.sent ? "Email sent." : data.mailto ? "Opening your mail app…" : "Email queued.");
                      if (data.mailto) window.location.href = data.mailto;
                      setEmailOpen(false);
                    })
                    .catch((err) => setSpeech(err.message))
                }
              >
                Send
              </Button>
              <Button tone="secondary" onClick={() => setEmailOpen(false)}>
                Cancel
              </Button>
            </div>
          </SurfaceCard>
        </div>
      ) : null}

      {shareOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4" role="dialog" aria-modal="true">
          <SurfaceCard className="kf-mobile-sheet w-full max-w-lg space-y-4 rounded-none p-5 pb-[calc(1.25rem+var(--kf-safe-bottom))] md:rounded-[var(--kf-radius-lg)] md:p-6 md:pb-6" elevated>
            <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-[var(--kf-border-strong)] md:hidden" />
            <h2 className="display text-3xl font-semibold">Share</h2>
            <Button
              tone="olive"
              className="w-full"
              onClick={() => {
                const url = `${window.location.origin}/recipes/${slug}`;
                if (navigator.share) {
                  void navigator.share({ title: recipe.title, text: recipe.description, url });
                } else {
                  void navigator.clipboard.writeText(url).then(() => setSpeech("Link copied."));
                }
                setShareOpen(false);
              }}
            >
              Native share / copy link
            </Button>
            <Button
              tone="secondary"
              className="w-full"
              onClick={() => {
                const url = `${window.location.origin}/recipes/${slug}`;
                void navigator.clipboard.writeText(url).then(() => {
                  setSpeech("Link copied.");
                  setShareOpen(false);
                });
              }}
            >
              Copy link
            </Button>
            <a
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[var(--kf-border-strong)] font-semibold"
              href={`sms:?&body=${encodeURIComponent(`${recipe.title} — ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
            >
              Text / SMS
            </a>
            <Button tone="ghost" className="w-full" onClick={() => setShareOpen(false)}>
              Close
            </Button>
          </SurfaceCard>
        </div>
      ) : null}

      {completeOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4" role="dialog" aria-modal="true">
          <SurfaceCard className="kf-mobile-sheet w-full max-w-lg space-y-4 rounded-none p-5 pb-[calc(1.25rem+var(--kf-safe-bottom))] md:rounded-[var(--kf-radius-lg)] md:p-6 md:pb-6" elevated>
            <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-[var(--kf-border-strong)] md:hidden" />
            <h2 className="display text-3xl font-semibold">Mark cooked</h2>
            <p className="text-[var(--kf-text-muted)]">Confirm inventory changes before we update your Kitchen.</p>
            <ul className="max-h-48 space-y-2 overflow-auto text-sm">
              {recipe.ingredients
                .filter((item) => item.quantity != null && !item.optional)
                .map((item) => (
                  <li key={item.canonicalId}>
                    Use {item.quantity}
                    {item.unit ? ` ${item.unit}` : ""} {item.name}
                  </li>
                ))}
            </ul>
            <label className="block space-y-2 text-sm font-semibold">
              Leftover servings
              <input
                value={leftoverQty}
                onChange={(event) => setLeftoverQty(event.target.value)}
                className="min-h-12 w-full rounded-full border border-[var(--kf-border-strong)] px-4 font-normal"
              />
            </label>
            <div className="flex gap-2">
              <Button
                tone="olive"
                className="flex-1"
                onClick={() =>
                  void act("complete", {
                    depletion: recipe.ingredients
                      .filter((item) => item.quantity != null && !item.optional)
                      .map((item) => ({
                        canonicalId: item.canonicalId,
                        name: item.name,
                        quantityUsed: item.quantity,
                        unit: item.unit,
                      })),
                    leftovers: {
                      name: `${recipe.title} leftovers`,
                      quantity: Number(leftoverQty) || 1,
                      unit: "servings",
                    },
                  }).then(() => {
                    setSpeech("Kitchen updated. Leftovers saved for later.");
                    setCompleteOpen(false);
                  })
                }
              >
                Confirm
              </Button>
              <Button tone="secondary" onClick={() => setCompleteOpen(false)}>
                Cancel
              </Button>
            </div>
          </SurfaceCard>
        </div>
      ) : null}

      <div className="kf-sticky-cta md:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button
            tone="olive"
            className="min-h-12 flex-[1.4] text-[0.95rem]"
            onClick={() => void act("start_cook").then((data) => router.push(`/cook/${data.session.id}`))}
          >
            Start Cooking
          </Button>
          <Button
            tone="secondary"
            className="min-h-12 flex-1 text-[0.9rem]"
            onClick={() => {
              const el = document.getElementById("can-i-make");
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Match
          </Button>
        </div>
      </div>
      <div className="h-20 md:hidden" aria-hidden />
    </PageShell>
  );
}
