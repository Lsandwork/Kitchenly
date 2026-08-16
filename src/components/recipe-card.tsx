import Image from "next/image";
import { Button, ButtonLink } from "@/components/ui";

export type ClientRecipe = {
  type: "existing" | "generated";
  state: "make_now" | "almost_there" | "created_for_you";
  id: string;
  slug: string;
  title: string;
  description: string;
  origin: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  servings: number;
  totalMinutes?: number | null;
  difficulty: string;
  cuisine?: string | null;
  whyPicked: string;
  explanation: string;
  available: { name: string; status: string; note?: string }[];
  missing: { name: string; quantity?: number | null; unit?: string | null }[];
  substitutions: { original: string; substitute: string; explanation: string }[];
  ingredients: { name: string; quantity?: number | null; unit?: string | null; optional?: boolean }[];
  steps: { order: number; instruction: string; timerSeconds?: number | null; tip?: string }[];
  equipment: string[];
  diets: string[];
};

export function stateCopy(state: ClientRecipe["state"]) {
  if (state === "make_now") return "You can make this right now";
  if (state === "created_for_you") return "I made this one for your kitchen";
  return "You're almost there";
}

function plateStyle(title: string) {
  const hues = [18, 32, 92, 140, 12];
  const hue = hues[title.length % hues.length];
  return {
    background: `radial-gradient(circle at 30% 30%, hsla(${hue},55%,72%,.9), hsla(${hue + 20},35%,28%,.95))`,
  };
}

export function RecipeCard({
  recipe,
  featured,
  onCook,
  onShop,
}: {
  recipe: ClientRecipe;
  featured?: boolean;
  onCook?: () => void;
  onShop?: () => void;
}) {
  return (
    <article className={`kf-card overflow-hidden rounded-[28px] ${featured ? "shadow-[var(--kf-shadow-floating)]" : ""}`}>
      <div className="relative h-44 w-full" style={recipe.imageUrl ? undefined : plateStyle(recipe.title)}>
        {recipe.imageUrl ? (
          <Image src={recipe.imageUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 420px" />
        ) : (
          <div className="flex h-full items-end p-5">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/85">
              {recipe.type === "generated" ? "Original" : recipe.sourceName || "Recipe"}
            </p>
          </div>
        )}
      </div>
      <div className="space-y-4 p-5">
        <p className="text-sm font-bold text-[var(--kf-terracotta)]">{stateCopy(recipe.state)}</p>
        <div>
          <h3 className="display text-2xl font-semibold leading-tight">{recipe.title}</h3>
          <p className="mt-2 text-[var(--kf-text-muted)]">{recipe.whyPicked || recipe.explanation}</p>
        </div>
        <p className="text-sm font-semibold text-[var(--kf-espresso)]">
          {recipe.totalMinutes ? `${recipe.totalMinutes} min` : "Weeknight"} · {recipe.difficulty}
          {recipe.state === "make_now" ? " · You already have everything" : null}
        </p>
        <div className="flex flex-wrap gap-2">
          {recipe.available
            .filter((item) => item.status === "have" || item.status === "close" || item.status === "substitute")
            .slice(0, 6)
            .map((item) => (
              <span
                key={item.name}
                className="rounded-full bg-[color-mix(in_srgb,var(--kf-olive)_12%,white)] px-3 py-1 text-sm font-semibold text-[var(--kf-olive)]"
              >
                ✓ {item.name}
              </span>
            ))}
          {recipe.missing.map((item) => (
            <span
              key={item.name}
              className="rounded-full bg-[color-mix(in_srgb,var(--tomato)_12%,white)] px-3 py-1 text-sm font-semibold text-[var(--tomato)]"
            >
              Need {item.name}
            </span>
          ))}
        </div>
        {recipe.substitutions[0] ? (
          <p className="text-sm text-[var(--kf-text-muted)]">
            <span className="font-bold text-[var(--kf-espresso)]">Can be used as a substitute:</span>{" "}
            {recipe.substitutions[0].original} → {recipe.substitutions[0].substitute}. {recipe.substitutions[0].explanation}
          </p>
        ) : null}
        {recipe.origin === "external" && recipe.sourceUrl ? (
          <p className="text-sm text-[var(--kf-text-muted)]">
            Existing recipe from{" "}
            <a className="font-bold underline" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
              {recipe.sourceName || "the original source"}
            </a>
            .
          </p>
        ) : recipe.type === "generated" ? (
          <p className="text-sm text-[var(--kf-text-muted)]">
            This one is original — I made it for your kitchen, not copied from a site.
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          {onCook ? (
            <Button className="flex-1" tone="olive" onClick={onCook}>
              Let&apos;s cook
            </Button>
          ) : (
            <ButtonLink className="flex-1" tone="olive" href={`/cook/new?recipe=${encodeURIComponent(recipe.id)}`}>
              Let&apos;s cook
            </ButtonLink>
          )}
          {recipe.missing.length ? (
            onShop ? (
              <Button tone="secondary" className="flex-1" onClick={onShop}>
                Find these locally
              </Button>
            ) : (
              <ButtonLink tone="secondary" className="flex-1" href="/shop">
                Get {recipe.missing.length === 1 ? recipe.missing[0].name : `${recipe.missing.length} things`}
              </ButtonLink>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}
