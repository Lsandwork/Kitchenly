"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon, SproutIcon } from "@/components/kf/icons";
import { ButtonLink } from "@/components/ui";
import { useLandingUser } from "@/components/landing/use-landing-user";
import { trackLanding } from "@/lib/landing-analytics";

const navLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "/recipes", label: "Recipes" },
  { href: "#features", label: "Features" },
] as const;

export function LandingHeader() {
  const user = useLandingUser();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    const frame = window.requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const primaryHref = user.guest ? "/signup" : "/tonight";
  const primaryLabel = user.guest ? "Start cooking free" : "Open Kitchen";
  const primaryEvent = user.guest ? "signup_cta_click" : "open_kitchen_click";

  return (
    <header className={`kf-landing-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="kf-landing-header-inner">
        <Link href="/" className="kf-landing-brand" aria-label="Kitchen Friend home">
          <span className="kf-landing-brand-mark">
            <SproutIcon size={18} />
          </span>
          <span className="display kf-landing-brand-name">Kitchen Friend</span>
        </Link>

        <nav className="kf-landing-nav" aria-label="Landing">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="kf-landing-nav-link"
              onClick={() => {
                if (link.href === "#how-it-works") trackLanding("how_it_works_click", { source: "header" });
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="kf-landing-header-actions">
          {user.guest ? (
            <Link
              href="/login"
              className="kf-landing-signin"
              onClick={() => trackLanding("login_click", { source: "header" })}
            >
              Sign in
            </Link>
          ) : (
            <span className="kf-landing-signed-in">{user.name || "Friend"}</span>
          )}
          <ButtonLink
            href={primaryHref}
            tone="olive"
            className="kf-landing-header-cta min-h-11 px-5 text-[0.95rem]"
            onClick={() => trackLanding(primaryEvent, { source: "header" })}
          >
            {primaryLabel}
          </ButtonLink>
          <button
            type="button"
            className="kf-landing-menu-btn"
            aria-expanded={open}
            aria-controls="kf-landing-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="kf-landing-mobile-nav" className="kf-landing-mobile-nav">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          {user.guest ? (
            <Link
              href="/login"
              onClick={() => {
                trackLanding("login_click", { source: "mobile_nav" });
                setOpen(false);
              }}
            >
              Sign in
            </Link>
          ) : null}
          <ButtonLink
            href={primaryHref}
            tone="olive"
            className="w-full"
            onClick={() => {
              trackLanding(primaryEvent, { source: "mobile_nav" });
              setOpen(false);
            }}
          >
            {primaryLabel}
          </ButtonLink>
        </div>
      ) : null}
    </header>
  );
}
