"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CartIcon,
  ChefHatIcon,
  ClockIcon,
  CloseIcon,
  LeafIcon,
  MenuIcon,
  ScanIcon,
  SparkleIcon,
  SproutIcon,
} from "@/components/kf/icons";
import { useLandingUser } from "@/components/landing/use-landing-user";
import { trackLanding } from "@/lib/landing-analytics";

/** Configurable social proof — replace when real metrics exist. */
const SOCIAL_PROOF = {
  label: "Loved by home cooks",
  rating: "4.9/5",
  detail: "from 12,000+ cooks",
  show: true,
} as const;

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "/recipes", label: "Recipes" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
] as const;

const INGREDIENTS = [
  { name: "Tomato", emoji: "🍅", bg: "#fde8e4" },
  { name: "Spinach", emoji: "🥬", bg: "#e8f0e4" },
  { name: "Lemon", emoji: "🍋", bg: "#fbf3d8" },
  { name: "Eggs", emoji: "🥚", bg: "#f7f1e6" },
  { name: "Yogurt", emoji: "🥛", bg: "#f3f0ea" },
  { name: "Chicken", emoji: "🍗", bg: "#f6ebe3" },
] as const;

const PROMPT_CHIPS = [
  { label: "Quick & easy", prompt: "Something quick and easy for tonight", Icon: ClockIcon },
  { label: "Vegetarian", prompt: "Vegetarian dinner with what I have", Icon: LeafIcon },
  { label: "High protein", prompt: "High protein dinner ideas", Icon: ChefHatIcon },
  { label: "Kid-friendly", prompt: "Kid-friendly dinner I can make tonight", Icon: SparkleIcon },
  { label: "Use up leftovers", prompt: "Help me use up leftovers", Icon: CartIcon },
] as const;

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UnderlineSquiggle() {
  return (
    <svg className="kf-mock-underline" viewBox="0 0 320 18" fill="none" aria-hidden>
      <path
        d="M4 11c28-6 56-8 86-6 34 2 66 8 100 7 36-1 72-8 108-9 8 0 14 1 18 2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MockLanding() {
  const router = useRouter();
  const user = useLandingUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    trackLanding("landing_view");
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function submitPrompt(value?: string) {
    const q = (value ?? prompt).trim();
    trackLanding("hero_demo_click", { source: "prompt" });
    if (!q) {
      router.push("/tonight");
      return;
    }
    sessionStorage.setItem("kf:landing-prompt", q);
    router.push(`/tonight?ask=${encodeURIComponent(q)}`);
  }

  function onPromptSubmit(event: FormEvent) {
    event.preventDefault();
    submitPrompt();
  }

  const primaryHref = user.guest ? "/signup" : "/tonight";

  return (
    <div className="kf-mock">
      {/* Floating nav */}
      <header className="kf-mock-nav-wrap">
        <div className="kf-mock-nav">
          <Link href="/" className="kf-mock-brand">
            <span className="kf-mock-brand-mark">
              <SproutIcon size={18} />
            </span>
            <span className="kf-mock-brand-name">Kitchen Friend</span>
          </Link>

          <nav className="kf-mock-nav-links" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="kf-mock-nav-actions">
            <Link
              href="/login"
              className="kf-mock-login"
              onClick={() => trackLanding("login_click", { source: "nav" })}
            >
              Log in
            </Link>
            <Link
              href={primaryHref}
              className="kf-mock-cta-nav"
              onClick={() =>
                trackLanding(user.guest ? "signup_cta_click" : "open_kitchen_click", { source: "nav" })
              }
            >
              Get started free
            </Link>
            <button
              type="button"
              className="kf-mock-menu-btn"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="kf-mock-mobile-menu">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              Log in
            </Link>
            <Link href={primaryHref} className="kf-mock-cta-nav" onClick={() => setMenuOpen(false)}>
              Get started free
            </Link>
          </div>
        ) : null}
      </header>

      <main className="kf-mock-hero">
        <div className="kf-mock-hero-grid">
          {/* Left copy */}
          <section className="kf-mock-copy">
            <p className="kf-mock-eyebrow">
              <SparkleIcon size={12} />
              YOUR KITCHEN. ENDLESS POSSIBILITIES.
            </p>
            <h1 className="kf-mock-title">
              <span>Turn what&apos;s in</span>
              <span>your kitchen into</span>
              <span className="kf-mock-title-accent">
                tonight&apos;s dinner
                <UnderlineSquiggle />
              </span>
            </h1>
            <p className="kf-mock-lede">
              Scan your fridge, discover recipes you can actually make,
              <br className="hidden sm:block" />
              and never wonder what to cook again.
            </p>
            <div className="kf-mock-actions">
              <Link
                href="/scan"
                className="kf-mock-btn-primary"
                onClick={() => trackLanding("scan_cta_click", { source: "hero" })}
              >
                <ScanIcon size={18} />
                Scan your fridge
                <ArrowIcon />
              </Link>
              <button
                type="button"
                className="kf-mock-btn-secondary"
                onClick={() => {
                  trackLanding("hero_demo_click", { source: "try_example" });
                  submitPrompt("Something quick with chicken, garlic, and lemon");
                }}
              >
                <LeafIcon size={16} />
                Try an example
              </button>
            </div>
            <ul className="kf-mock-micro">
              <li>
                <SparkleIcon size={13} />
                AI-powered suggestions
              </li>
              <li>
                <LeafIcon size={13} />
                No waste, more taste
              </li>
              <li>
                <ClockIcon size={13} />
                Works in seconds
              </li>
            </ul>
          </section>

          {/* Visual */}
          <section className="kf-mock-visual" aria-label="Kitchen Friend product preview">
            <div className="kf-mock-photo">
              <Image
                src="/assets/landing-hero-lifestyle.png"
                alt="Home cook checking Kitchen Friend on her phone beside an open fridge"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover"
              />
              <div className="kf-mock-photo-fade" />
            </div>

            {/* Ingredient recognition card */}
            <aside className="kf-mock-ingredients">
              <div className="kf-mock-ingredients-top">
                <button type="button" className="kf-mock-back" aria-label="Back">
                  <ArrowIcon size={14} />
                </button>
                <span className="kf-mock-mini-mark">
                  <SproutIcon size={12} />
                </span>
              </div>
              <h2>Found 12 ingredients</h2>
              <p>Here&apos;s what we found</p>
              <div className="kf-mock-ing-grid">
                {INGREDIENTS.map((item) => (
                  <div key={item.name} className="kf-mock-ing">
                    <span className="kf-mock-ing-tile" style={{ background: item.bg }}>
                      <span aria-hidden>{item.emoji}</span>
                    </span>
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
              <Link href="/kitchen" className="kf-mock-ing-cta">
                See all ingredients
              </Link>
            </aside>

            {/* Dinner ideas card */}
            <aside className="kf-mock-dinner">
              <p className="kf-mock-dinner-label">
                <SparkleIcon size={12} />
                Dinner ideas for you
              </p>
              <div className="kf-mock-dinner-card">
                <div className="kf-mock-dinner-media">
                  <Image
                    src="/assets/recipes/lemon-garlic-chicken-skillet.jpg"
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
                <div className="kf-mock-dinner-body">
                  <h3>
                    Lemon Garlic
                    <br />
                    Chicken &amp; Veggies
                  </h3>
                  <p>
                    <ClockIcon size={12} /> 25 min
                    <span>·</span>
                    Easy
                  </p>
                </div>
                <Link
                  href="/recipes/lemon-garlic-chicken-skillet"
                  className="kf-mock-dinner-next"
                  aria-label="View recipe"
                  onClick={() => trackLanding("recipe_preview_click", { slug: "lemon-garlic-chicken-skillet" })}
                >
                  <ArrowIcon size={16} />
                </Link>
              </div>
              <div className="kf-mock-dots" aria-hidden>
                <span className="is-active" />
                <span />
                <span />
              </div>
              <Link
                href="/recipes/lemon-garlic-chicken-skillet"
                className="kf-mock-dinner-cta"
                onClick={() => trackLanding("recipe_preview_click", { slug: "lemon-garlic-chicken-skillet" })}
              >
                View full recipe
              </Link>
            </aside>
          </section>
        </div>

        {/* Bottom prompt panel */}
        <section className="kf-mock-prompt" aria-label="Ask Kitchen Friend">
          <div className="kf-mock-prompt-inner">
            <div className="kf-mock-prompt-main">
              <p className="kf-mock-prompt-label">Not sure what to make?</p>
              <form className="kf-mock-prompt-form" onSubmit={onPromptSubmit}>
                <span className="kf-mock-prompt-leaf" aria-hidden>
                  <LeafIcon size={18} />
                </span>
                <input
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder='Ask anything... e.g. "Something quick with chicken"'
                  aria-label="Ask Kitchen Friend what to make"
                />
                <button type="submit" className="kf-mock-prompt-submit">
                  Get ideas
                  <SparkleIcon size={14} />
                </button>
              </form>
              <div className="kf-mock-chips">
                {PROMPT_CHIPS.map(({ label, prompt: chipPrompt, Icon }) => (
                  <button key={label} type="button" onClick={() => submitPrompt(chipPrompt)}>
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {SOCIAL_PROOF.show ? (
              <div className="kf-mock-social">
                <p>{SOCIAL_PROOF.label}</p>
                <div className="kf-mock-avatars" aria-hidden>
                  <span style={{ background: "#c4a484" }} />
                  <span style={{ background: "#8b9b76" }} />
                  <span style={{ background: "#d4a574" }} />
                  <span style={{ background: "#6b574c" }} />
                </div>
                <div className="kf-mock-stars" aria-label={`${SOCIAL_PROOF.rating} stars`}>
                  {"★★★★★"}
                </div>
                <p className="kf-mock-social-score">
                  {SOCIAL_PROOF.rating} {SOCIAL_PROOF.detail}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      {/* Lightweight anchors for nav targets used on this page */}
      <section id="how-it-works" className="kf-mock-anchor-section">
        <div className="kf-mock-anchor-inner">
          <p className="kf-mock-eyebrow">
            <SparkleIcon size={12} />
            How it works
          </p>
          <h2 className="kf-mock-anchor-title">From fridge to dinner in three steps.</h2>
          <div className="kf-mock-steps">
            <article>
              <span>01</span>
              <h3>Scan your kitchen</h3>
              <p>Photograph your fridge or pantry and Kitchen Friend builds your inventory.</p>
            </article>
            <article>
              <span>02</span>
              <h3>See what fits</h3>
              <p>Recipes are ranked for what you already have — not an empty shopping cart.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Fill only the gaps</h3>
              <p>Missing ingredients become a focused list so you buy less and cook sooner.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="features" className="kf-mock-anchor-section is-soft">
        <div className="kf-mock-anchor-inner">
          <p className="kf-mock-eyebrow">
            <LeafIcon size={12} />
            Features
          </p>
          <h2 className="kf-mock-anchor-title">Built around the kitchen you actually have.</h2>
          <div className="kf-mock-feature-row">
            <article>
              <h3>Kitchen Match</h3>
              <p>Recipes ranked by what you own, your time, and how you cook.</p>
            </article>
            <article>
              <h3>Smart shopping</h3>
              <p>Buy the gaps — not the whole ingredient list.</p>
            </article>
            <article>
              <h3>Your rules</h3>
              <p>Allergies stay hard rules. Preferences shape every suggestion.</p>
            </article>
          </div>
        </div>
      </section>

      <footer className="kf-mock-footer">
        <Link href="/" className="kf-mock-brand">
          <span className="kf-mock-brand-mark">
            <SproutIcon size={16} />
          </span>
          <span className="kf-mock-brand-name">Kitchen Friend</span>
        </Link>
        <nav>
          <Link href="/recipes">Recipes</Link>
          <Link href="/scan">Scan</Link>
          <Link href="/login">Log in</Link>
          <Link href="/signup">Get started free</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
