import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "primary" | "secondary" | "ghost" | "olive";

const tones: Record<Tone, string> = {
  primary:
    "bg-terracotta text-cream hover:bg-[var(--terracotta-deep)] shadow-[0_10px_24px_rgba(194,75,29,.28)]",
  secondary: "bg-cream text-ink border border-[var(--line)] hover:bg-paper-deep",
  ghost: "bg-transparent text-ink hover:bg-paper-deep",
  olive: "bg-olive text-cream hover:brightness-110",
};

export function Button({
  tone = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; children: ReactNode }) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-5 text-base font-bold disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  tone = "primary",
  className = "",
  children,
}: {
  href: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-5 text-base font-bold ${tones[tone]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Chip({
  children,
  onClick,
  active,
  unsure,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  unsure?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-full border px-3 py-1.5 text-sm font-semibold ${
        active
          ? "border-olive bg-olive text-cream"
          : unsure
            ? "border-dashed border-ink-soft bg-butter/40 text-ink"
            : "border-[var(--line)] bg-cream text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ kicker, title, body }: { kicker?: string; title: string; body?: string }) {
  return (
    <div className="space-y-2">
      {kicker ? <p className="text-sm font-bold uppercase tracking-[0.18em] text-terracotta">{kicker}</p> : null}
      <h2 className="display text-3xl font-semibold md:text-4xl">{title}</h2>
      {body ? <p className="max-w-2xl text-lg text-ink-soft">{body}</p> : null}
    </div>
  );
}
