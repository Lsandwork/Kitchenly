"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Tonight" },
  { href: "/scan", label: "Scan" },
  { href: "/kitchen", label: "Kitchen" },
  { href: "/shop", label: "Shop" },
];

export function Nav() {
  const path = usePathname();
  const cooking = path.startsWith("/cook");
  if (cooking) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_88%,white)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-olive text-cream" aria-hidden>
            ⌘
          </span>
          <span className="display text-xl font-semibold">Kitchen Friend</span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
          {links.map((link) => {
            const active = path === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  active ? "bg-ink text-cream" : "text-ink-soft hover:bg-paper-deep"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/settings" className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-paper-deep">
            You
          </Link>
        </nav>
      </div>
      <nav
        className="grid grid-cols-4 border-t border-[var(--line)] bg-cream sm:hidden"
        aria-label="Mobile"
      >
        {links.map((link) => {
          const active = path === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`min-h-14 px-2 py-3 text-center text-sm font-bold ${
                active ? "text-terracotta" : "text-ink-soft"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
