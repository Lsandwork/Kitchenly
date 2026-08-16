"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Button, PageShell, SectionTitle, SurfaceCard } from "@/components/ui";

type Entry = {
  id: string;
  title: string;
  date: string;
  mealType: string;
  servings: number;
  recipeId?: string | null;
  recipe?: { slug: string } | null;
};

type ShoppingItem = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  canonicalId: string;
};

export default function MealPlanPage() {
  const [pending, startTransition] = useTransition();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [emails, setEmails] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      void fetch("/api/recipes/meal-plan")
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          setEntries(data.entries || []);
          setShopping(data.shopping || []);
        })
        .catch(() => {
          if (!cancelled) setEntries([]);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [startTransition]);

  async function reload() {
    const res = await fetch("/api/recipes/meal-plan");
    const data = await res.json();
    setEntries(data.entries || []);
    setShopping(data.shopping || []);
  }

  async function emailWeek() {
    const res = await fetch("/api/recipes/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "email_week",
        emails: emails.split(/[,\s]+/).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Email failed");
      return;
    }
    setMessage(data.sent ? "Week emailed." : data.mailto ? "Opening mail app…" : "Queued.");
    if (data.mailto) window.location.href = data.mailto;
  }

  function copyShopping() {
    const text = [
      "Weekly Shopping List — Kitchen Friend",
      "",
      ...shopping.map((item) => {
        const qty = item.quantity != null ? ` — ${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : "";
        return `• ${item.name}${qty}`;
      }),
    ].join("\n");
    void navigator.clipboard.writeText(text).then(() => setMessage("Weekly list copied."));
  }

  return (
    <PageShell>
      <SectionTitle
        kicker="Meal plan"
        title="Your week"
        body="Plan dinners, then generate one shopping list that subtracts what you already own."
      />

      {message ? <p className="mt-4 text-[var(--kf-olive)]">{message}</p> : null}
      {pending && entries === null ? <p className="mt-4 text-[var(--kf-text-muted)]">Loading your plan…</p> : null}

      <div className="mt-8 grid gap-4">
        {entries?.length ? (
          entries.map((entry) => (
            <SurfaceCard key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--kf-terracotta)]">
                  {new Date(entry.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} ·{" "}
                  {entry.mealType}
                </p>
                <h2 className="display text-2xl font-semibold">{entry.title}</h2>
                <p className="text-sm text-[var(--kf-text-muted)]">Serves {entry.servings}</p>
              </div>
              <div className="flex gap-2">
                {entry.recipe?.slug ? (
                  <Link
                    href={`/recipes/${entry.recipe.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-[var(--kf-border-strong)] px-4 text-sm font-semibold"
                  >
                    Open
                  </Link>
                ) : null}
                <Button
                  tone="ghost"
                  onClick={() =>
                    void fetch("/api/recipes/meal-plan", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "remove", id: entry.id }),
                    }).then(reload)
                  }
                >
                  Remove
                </Button>
              </div>
            </SurfaceCard>
          ))
        ) : entries ? (
          <SurfaceCard className="p-8 text-center">
            <p className="display text-3xl">No meals planned</p>
            <p className="mt-2 text-[var(--kf-text-muted)]">Add recipes from any recipe page.</p>
            <Link href="/recipes" className="mt-4 inline-flex min-h-12 items-center rounded-full bg-[var(--kf-olive)] px-5 font-semibold text-white">
              Plan my week
            </Link>
          </SurfaceCard>
        ) : null}
      </div>

      <SurfaceCard className="mt-10 space-y-4 p-6" elevated>
        <h2 className="display text-3xl font-semibold">Weekly shopping list</h2>
        <p className="text-[var(--kf-text-muted)]">Duplicates merged. Kitchen inventory already subtracted.</p>
        {shopping.length ? (
          <ul className="space-y-2">
            {shopping.map((item) => (
              <li key={item.canonicalId + item.name} className="font-semibold">
                □ {item.name}
                {item.quantity != null ? ` — ${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--kf-text-muted)]">Nothing to buy — or add meals first.</p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button tone="secondary" onClick={copyShopping}>
            Copy list
          </Button>
          <Button tone="secondary" onClick={() => window.print()}>
            Print
          </Button>
          <Link href="/shop" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--kf-border-strong)] px-5 font-semibold">
            Add to Shop
          </Link>
        </div>
        <div className="flex flex-col gap-3 border-t border-[var(--kf-border)] pt-4 sm:flex-row">
          <input
            value={emails}
            onChange={(event) => setEmails(event.target.value)}
            placeholder="Email my week"
            className="min-h-12 flex-1 rounded-full border border-[var(--kf-border-strong)] px-4 outline-none"
          />
          <Button tone="olive" onClick={() => void emailWeek()}>
            Email My Week
          </Button>
        </div>
      </SurfaceCard>
    </PageShell>
  );
}
