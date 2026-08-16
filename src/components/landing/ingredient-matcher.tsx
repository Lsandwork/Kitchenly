"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip } from "@/components/ui";
import { trackLanding } from "@/lib/landing-analytics";

const STARTERS = [
  "Chicken",
  "Eggs",
  "Rice",
  "Garlic",
  "Spinach",
  "Broccoli",
  "Pasta",
  "Tomatoes",
  "Potatoes",
  "Cheese",
] as const;

export function IngredientMatcher() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(["Chicken", "Garlic", "Rice"]);
  const [custom, setCustom] = useState("");
  const [adding, setAdding] = useState(false);

  function toggle(name: string) {
    setSelected((prev) => {
      const next = prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name];
      trackLanding("ingredient_selected", { count: next.length });
      return next;
    });
  }

  function addCustom(event: FormEvent) {
    event.preventDefault();
    const value = custom.trim();
    if (!value) return;
    const label = value[0].toUpperCase() + value.slice(1);
    if (!selected.includes(label)) {
      setSelected((prev) => [...prev, label]);
      trackLanding("ingredient_selected", { count: selected.length + 1, custom: true });
    }
    setCustom("");
    setAdding(false);
  }

  function findRecipes() {
    const q = selected.join(" ");
    trackLanding("ingredient_recipe_search", { count: selected.length });
    router.push(q ? `/recipes?q=${encodeURIComponent(q)}` : "/recipes");
  }

  return (
    <section id="whats-in-your-kitchen" className="kf-landing-section kf-landing-matcher">
      <div className="kf-landing-section-head">
        <p className="kf-eyebrow">Try it</p>
        <h2 className="display kf-landing-h2">What&apos;s in your kitchen?</h2>
        <p className="kf-landing-lede">Pick a few things. We&apos;ll take it from there.</p>
      </div>
      <div className="kf-landing-matcher-board">
        <div className="flex flex-wrap gap-2.5">
          {STARTERS.map((name) => (
            <Chip key={name} active={selected.includes(name)} onClick={() => toggle(name)}>
              {name}
            </Chip>
          ))}
          {selected
            .filter((name) => !(STARTERS as readonly string[]).includes(name))
            .map((name) => (
              <Chip key={name} active onClick={() => toggle(name)}>
                {name}
              </Chip>
            ))}
          {adding ? (
            <form onSubmit={addCustom} className="kf-landing-add-form">
              <input
                autoFocus
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                placeholder="Add an ingredient"
                aria-label="Add an ingredient"
              />
              <Button type="submit" tone="olive" className="min-h-10 px-4">
                Add
              </Button>
            </form>
          ) : (
            <Chip onClick={() => setAdding(true)}>+ Add ingredient</Chip>
          )}
        </div>
        <div className="kf-landing-matcher-actions">
          <Button tone="olive" className="min-h-14 px-7" onClick={findRecipes} disabled={!selected.length}>
            Find something to make
          </Button>
          <p className="text-sm text-[var(--kf-text-muted)]">
            {selected.length ? `${selected.length} selected` : "Pick at least one ingredient"}
          </p>
        </div>
      </div>
    </section>
  );
}
