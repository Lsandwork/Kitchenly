import Image from "next/image";
import Link from "next/link";

export type RecipeCardData = {
  slug: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  totalMinutes?: number | null;
  difficulty?: string;
  kitchenMatchPercent?: number;
  why?: string;
  missingCount?: number;
  trending?: boolean;
};

function plateStyle(title: string) {
  const hues = [18, 32, 92, 140, 12];
  const hue = hues[title.length % hues.length];
  return {
    background: `radial-gradient(circle at 30% 30%, hsla(${hue},55%,72%,.9), hsla(${hue + 20},35%,28%,.95))`,
  };
}

export function RecipeCardLink({ card }: { card: RecipeCardData }) {
  return (
    <Link
      href={`/recipes/${card.slug}`}
      className="kf-card group block touch-manipulation overflow-hidden rounded-[28px] transition hover:-translate-y-0.5 hover:shadow-[var(--kf-shadow-floating)] active:scale-[0.99]"
    >
      <div className="relative h-48 w-full" style={card.imageUrl ? undefined : plateStyle(card.title)}>
        {card.imageUrl ? (
          <Image src={card.imageUrl} alt="" fill className="pointer-events-none object-cover" sizes="(max-width: 768px) 100vw, 360px" />
        ) : (
          <div className="flex h-full items-end p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/85">Kitchen Friend</p>
          </div>
        )}
        {typeof card.kitchenMatchPercent === "number" ? (
          <span className="absolute left-4 top-4 rounded-full bg-[color-mix(in_srgb,var(--kf-surface-elevated)_92%,transparent)] px-3 py-1 text-sm font-bold text-[var(--kf-olive)] shadow-[var(--kf-shadow-subtle)] backdrop-blur">
            {card.kitchenMatchPercent}% Kitchen Match
          </span>
        ) : null}
        {card.trending ? (
          <span className="absolute right-4 top-4 rounded-full bg-[var(--kf-terracotta)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[var(--kf-shadow-subtle)]">
            Trending
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-5">
        <h3 className="display text-2xl font-semibold leading-tight text-[var(--kf-espresso)] group-hover:text-[var(--kf-olive)]">
          {card.title}
        </h3>
        <p className="line-clamp-2 text-[var(--kf-text-muted)]">{card.why || card.description}</p>
        <p className="text-sm font-semibold text-[var(--kf-espresso)]">
          {card.totalMinutes ? `${card.totalMinutes} min` : "Flexible"} · {card.difficulty || "easy"}
          {card.missingCount != null && card.missingCount > 0
            ? ` · Missing ${card.missingCount}`
            : card.missingCount === 0
              ? " · No store trip"
              : null}
        </p>
      </div>
    </Link>
  );
}
