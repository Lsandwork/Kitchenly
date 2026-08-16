import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "primary" | "secondary" | "ghost" | "olive" | "ask";

const tones: Record<Tone, string> = {
  primary:
    "bg-[var(--kf-terracotta)] text-white shadow-[var(--kf-shadow-ask)] hover:bg-[var(--kf-terracotta-dark)] kf-lift",
  secondary:
    "bg-[var(--kf-surface)] text-[var(--kf-espresso)] border border-[var(--kf-border-strong)] hover:bg-white kf-lift",
  ghost: "bg-transparent text-[var(--kf-espresso)] hover:bg-[var(--kf-surface)]",
  olive:
    "bg-[var(--kf-olive)] text-white shadow-[var(--kf-shadow-button)] hover:bg-[var(--kf-olive-dark)] kf-lift",
  ask: "bg-[var(--kf-terracotta)] text-white shadow-[var(--kf-shadow-ask)] hover:bg-[var(--kf-terracotta-dark)] kf-lift",
};

const baseBtn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold tracking-[-0.01em] disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  tone = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; children: ReactNode }) {
  return (
    <button className={`${baseBtn} ${tones[tone]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  tone = "primary",
  className = "",
  children,
  ...props
}: {
  href: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={`${baseBtn} ${tones[tone]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

export function Chip({
  children,
  onClick,
  active,
  unsure,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  unsure?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold kf-lift ${
        active
          ? "border-[var(--kf-olive)] bg-[var(--kf-olive)] text-white"
          : unsure
            ? "border-dashed border-[var(--kf-text-muted)] bg-[color-mix(in_srgb,var(--kf-gold-soft)_35%,white)] text-[var(--kf-espresso)]"
            : "border-[var(--kf-border-strong)] bg-[var(--kf-surface)] text-[var(--kf-espresso)] hover:bg-white hover:shadow-[var(--kf-shadow-subtle)]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function SuggestionChip({
  children,
  onClick,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--kf-border-strong)] bg-[var(--kf-surface)] px-4 py-2 text-sm font-semibold text-[var(--kf-espresso)] shadow-[var(--kf-shadow-subtle)] hover:bg-white hover:shadow-[var(--kf-shadow-card)] kf-lift"
    >
      {icon ? <span className="text-[var(--kf-text-muted)]">{icon}</span> : null}
      {children}
    </button>
  );
}

export function SectionTitle({ kicker, title, body }: { kicker?: string; title: string; body?: string }) {
  return (
    <div className="space-y-1.5 md:space-y-2">
      {kicker ? <p className="kf-eyebrow">{kicker}</p> : null}
      <h2 className="display text-[1.85rem] font-semibold leading-tight md:text-4xl">{title}</h2>
      {body ? <p className="max-w-2xl text-base text-[var(--kf-text-muted)] md:text-lg">{body}</p> : null}
    </div>
  );
}

export function PageShell({
  children,
  className = "",
  narrow,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <main className={`kf-page pb-8 pt-4 md:pb-24 md:pt-10 ${narrow ? "max-w-3xl" : ""} ${className}`}>{children}</main>
  );
}

export function SurfaceCard({
  children,
  className = "",
  elevated,
  id,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  id?: string;
}) {
  const hasRadius = /\brounded/.test(className);
  return (
    <div
      id={id}
      className={`${elevated ? "kf-floating" : "kf-card"} ${hasRadius ? "" : "rounded-[var(--kf-radius-lg)]"} ${className}`}
    >
      {children}
    </div>
  );
}
