"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/ui";

const DIETS = ["Vegetarian", "High protein", "Dairy free", "Gluten free"] as const;
const ALLERGIES = ["Peanut", "Shellfish", "Dairy"] as const;
const GEAR = ["Stovetop", "Oven", "Air fryer", "Instant Pot"] as const;

const SAMPLE = [
  { title: "Garlic Spinach Pasta", minutes: 20, base: 74 },
  { title: "Sheet-Pan Chicken", minutes: 35, base: 68 },
  { title: "Lemon Skillet Chicken", minutes: 30, base: 81 },
] as const;

export function PersonalizationDemo() {
  const [diets, setDiets] = useState<string[]>(["High protein"]);
  const [allergies, setAllergies] = useState<string[]>(["Peanut"]);
  const [gear, setGear] = useState<string[]>(["Stovetop", "Oven"]);
  const [servings, setServings] = useState(2);
  const [minutes, setMinutes] = useState(30);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  const cards = useMemo(
    () =>
      SAMPLE.map((item) => {
        let score = item.base;
        if (diets.includes("High protein")) score += 6;
        if (diets.includes("Vegetarian") && item.title.includes("Chicken")) score -= 28;
        if (allergies.includes("Dairy") && item.title.includes("Pasta")) score -= 8;
        if (gear.includes("Air fryer")) score += 2;
        if (item.minutes > minutes) score -= 10;
        return { ...item, score: Math.max(12, Math.min(98, score + servings)) };
      }).sort((a, b) => b.score - a.score),
    [allergies, diets, gear, minutes, servings],
  );

  return (
    <section className="kf-landing-section kf-landing-personalization">
      <div className="kf-landing-section-head">
        <p className="kf-eyebrow">Personalization</p>
        <h2 className="display kf-landing-h2">Your kitchen. Your rules.</h2>
        <p className="kf-landing-lede">
          Tell Kitchen Friend once. Let it remember the details every night after that.
        </p>
      </div>
      <div className="kf-landing-personalization-grid">
        <div className="kf-landing-personalization-controls">
          <div>
            <p className="kf-landing-field-label">Dietary preferences</p>
            <div className="flex flex-wrap gap-2">
              {DIETS.map((item) => (
                <Chip key={item} active={diets.includes(item)} onClick={() => toggle(diets, item, setDiets)}>
                  {item}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="kf-landing-field-label">Allergies — hard rules</p>
            <div className="flex flex-wrap gap-2">
              {ALLERGIES.map((item) => (
                <Chip key={item} active={allergies.includes(item)} onClick={() => toggle(allergies, item, setAllergies)}>
                  {item}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="kf-landing-field-label">Equipment</p>
            <div className="flex flex-wrap gap-2">
              {GEAR.map((item) => (
                <Chip key={item} active={gear.includes(item)} onClick={() => toggle(gear, item, setGear)}>
                  {item}
                </Chip>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="kf-landing-slider">
              Usual servings
              <input
                type="range"
                min={1}
                max={6}
                value={servings}
                onChange={(event) => setServings(Number(event.target.value))}
              />
              <span>{servings}</span>
            </label>
            <label className="kf-landing-slider">
              Weeknight minutes
              <input
                type="range"
                min={15}
                max={60}
                step={5}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
              />
              <span>{minutes}</span>
            </label>
          </div>
        </div>
        <div className="kf-landing-personalization-results" aria-live="polite">
          <p className="kf-landing-field-label">Tonight shifts with you</p>
          {cards.map((card) => (
            <article key={card.title} className="kf-landing-personalization-card">
              <div>
                <h3 className="display text-xl">{card.title}</h3>
                <p className="text-sm text-[var(--kf-text-muted)]">{card.minutes} min</p>
              </div>
              <span>{card.score}% match</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
