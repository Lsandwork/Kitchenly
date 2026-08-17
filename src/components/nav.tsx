"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CartIcon,
  ChefHatIcon,
  JarIcon,
  LeafIcon,
  ScanIcon,
  SproutIcon,
  UserIcon,
} from "@/components/kf/icons";

const links = [
  { href: "/tonight", label: "Tonight", Icon: LeafIcon },
  { href: "/recipes", label: "Recipes", Icon: ChefHatIcon },
  { href: "/scan", label: "Scan", Icon: ScanIcon },
  { href: "/kitchen", label: "Kitchen", Icon: JarIcon },
  { href: "/shop", label: "Shop", Icon: CartIcon },
  { href: "/settings", label: "You", Icon: UserIcon },
] as const;

function isActive(path: string, href: string) {
  if (href === "/tonight") return path === "/tonight" || path.startsWith("/tonight?");
  return path === href || path.startsWith(`${href}/`);
}

function mobileTitle(path: string) {
  if (path.startsWith("/recipes/plan")) return "Meal plan";
  if (/^\/recipes\/[^/]+/.test(path)) return "Recipe";
  if (path.startsWith("/cook")) return "Cooking";
  if (path === "/tonight") return "Tonight";
  return links.find((link) => isActive(path, link.href))?.label ?? "Dishly";
}

export function AppHeader() {
  const path = usePathname();
  const cooking = path.startsWith("/cook");
  const auth = path === "/login" || path === "/signup";
  const marketing = path === "/" || path === "/pricing" || path === "/blog" || path.startsWith("/blog/");
  const admin = path === "/admin" || path.startsWith("/admin/");
  if (cooking || auth || marketing || admin) return null;

  const title = mobileTitle(path);

  return (
    <>
      {/* Desktop floating pill */}
      <header className="sticky top-0 z-50 hidden px-6 pt-5 md:block">
        <div className="mx-auto flex max-w-[var(--kf-header-max)] items-center gap-3 rounded-full border border-[var(--kf-border)] bg-[color-mix(in_srgb,var(--kf-surface-elevated)_92%,transparent)] px-4 py-2.5 shadow-[var(--kf-shadow-nav)] backdrop-blur-xl">
          <Link href="/tonight" className="flex min-w-0 items-center gap-2.5 pl-1">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--kf-olive)] text-white shadow-[0_8px_18px_rgba(74,93,63,.28)]">
              <SproutIcon size={18} />
            </span>
            <span className="display truncate text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--kf-espresso)]">
              Dishly
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-1" aria-label="Primary">
            {links.map((link) => {
              const active = isActive(path, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-[0.92rem] font-semibold tracking-[-0.01em] ${
                    active
                      ? "bg-[var(--kf-espresso)] text-white shadow-[0_8px_20px_rgba(42,26,18,.22)]"
                      : "text-[var(--kf-espresso)] hover:bg-[var(--kf-background-deep)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile top chrome — compact app bar */}
      <header className="kf-mobile-top sticky top-0 z-50 md:hidden">
        <div className="flex h-[var(--kf-mobile-top)] items-center gap-3 px-4">
          <Link
            href="/tonight"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--kf-olive)] text-white shadow-[0_6px_14px_rgba(74,93,63,.28)]"
            aria-label="Tonight"
          >
            <SproutIcon size={16} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--kf-terracotta)]">
              Dishly
            </p>
            <h1 className="display truncate text-[1.2rem] font-semibold leading-tight tracking-[-0.03em]">
              {title}
            </h1>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="kf-tabbar md:hidden" aria-label="Primary">
        <div className="kf-tabbar-inner">
          {links.map((link) => {
            const active = isActive(path, link.href);
            const Icon = link.Icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`kf-tab ${active ? "kf-tab-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="kf-tab-icon">
                  <Icon size={22} />
                </span>
                <span className="kf-tab-label">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

/** @deprecated Use AppHeader */
export const Nav = AppHeader;
