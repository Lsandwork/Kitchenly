"use client";

import Link from "next/link";
import {
  CartIcon,
  ChefHatIcon,
  JarIcon,
  LeafIcon,
  ScanIcon,
  SproutIcon,
} from "@/components/kf/icons";
import { ButtonLink } from "@/components/ui";
import { FAQS } from "@/components/landing/faq-data";
import { trackLanding } from "@/lib/landing-analytics";

export function ProblemComparison() {
  return (
    <section className="kf-landing-section kf-landing-statement">
      <h2 className="display kf-landing-statement-title">
        Stop searching for recipes that assume you have a different kitchen.
      </h2>
      <p className="kf-landing-statement-support">
        Kitchen Friend starts with <em>yours</em>.
      </p>
      <div className="kf-landing-compare">
        <article className="kf-landing-compare-card is-old">
          <p className="kf-landing-field-label">Most recipe apps</p>
          <ol>
            <li>Pick a recipe</li>
            <li>Buy everything</li>
            <li>Cook</li>
          </ol>
        </article>
        <article className="kf-landing-compare-card is-new">
          <p className="kf-landing-field-label">Kitchen Friend</p>
          <ol>
            <li>Your kitchen</li>
            <li>Possibilities</li>
            <li>Only buy what&apos;s missing</li>
            <li>Cook</li>
          </ol>
        </article>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="kf-landing-section kf-landing-how">
      <div className="kf-landing-section-head">
        <p className="kf-eyebrow">How it works</p>
        <h2 className="display kf-landing-h2">From fridge to dinner.</h2>
      </div>
      <div className="kf-landing-how-track">
        <article className="kf-landing-how-step">
          <span className="kf-landing-how-num">01</span>
          <div className="kf-landing-how-icon">
            <ScanIcon size={22} />
          </div>
          <h3 className="display text-2xl md:text-3xl">Show us your kitchen</h3>
          <p>Photograph your fridge, freezer, pantry, cabinet, or counter.</p>
          <ButtonLink
            href="/scan"
            tone="olive"
            className="mt-2"
            onClick={() => trackLanding("scan_cta_click", { source: "how_it_works" })}
          >
            Scan my kitchen
          </ButtonLink>
        </article>
        <article className="kf-landing-how-step">
          <span className="kf-landing-how-num">02</span>
          <div className="kf-landing-how-icon">
            <ChefHatIcon size={22} />
          </div>
          <h3 className="display text-2xl md:text-3xl">Find what fits</h3>
          <p>
            Match recipes to what you already have, plus diets, allergies, equipment, and weeknight time.
          </p>
          <ButtonLink href="/recipes" tone="secondary" className="mt-2">
            Explore recipes
          </ButtonLink>
        </article>
        <article className="kf-landing-how-step">
          <span className="kf-landing-how-num">03</span>
          <div className="kf-landing-how-icon">
            <CartIcon size={22} />
          </div>
          <h3 className="display text-2xl md:text-3xl">Fill the gaps</h3>
          <p>Missing ingredients become a shopping list — not a full rebuild of dinner.</p>
          <ButtonLink
            href="/shop"
            tone="secondary"
            className="mt-2"
            onClick={() => trackLanding("shop_cta_click", { source: "how_it_works" })}
          >
            See smart shopping
          </ButtonLink>
        </article>
      </div>
    </section>
  );
}

export function FeatureBento() {
  return (
    <section id="features" className="kf-landing-section">
      <div className="kf-landing-section-head">
        <p className="kf-eyebrow">Features</p>
        <h2 className="display kf-landing-h2">Built for the kitchen you actually have.</h2>
      </div>
      <div className="kf-landing-bento">
        <article className="kf-landing-bento-card is-wide">
          <p className="kf-landing-field-label">
            <ScanIcon size={14} /> Scan the kitchen
          </p>
          <h3 className="display text-3xl">Point. Scan. Done.</h3>
          <p>Turn what Kitchen Friend sees into a kitchen you can actually cook from.</p>
          <div className="kf-landing-bento-flow">
            <span>Camera</span>
            <span>→</span>
            <span>Ingredients</span>
            <span>→</span>
            <span>Inventory</span>
          </div>
        </article>
        <article className="kf-landing-bento-card">
          <p className="kf-landing-field-label">
            <ChefHatIcon size={14} /> Kitchen Match
          </p>
          <h3 className="display text-3xl">Recipes ranked for your kitchen.</h3>
          <p>Start with what you own instead of what a recipe wishes you owned.</p>
          <div className="kf-landing-bento-match">92% Kitchen Match</div>
        </article>
        <article className="kf-landing-bento-card">
          <p className="kf-landing-field-label">
            <JarIcon size={14} /> Your Kitchen
          </p>
          <h3 className="display text-3xl">A kitchen that remembers.</h3>
          <p>Fridge, pantry, and freezer — organized so tomorrow&apos;s suggestions get smarter.</p>
          <ul className="kf-landing-bento-list">
            <li>Fridge · eggs, spinach</li>
            <li>Pantry · rice, garlic</li>
            <li>Freezer · chicken</li>
          </ul>
        </article>
        <article className="kf-landing-bento-card">
          <p className="kf-landing-field-label">
            <CartIcon size={14} /> Smart Shop
          </p>
          <h3 className="display text-3xl">Buy the gaps. Not the whole recipe.</h3>
          <div className="kf-landing-shop-lanes">
            <span>Need</span>
            <span>Maybe</span>
            <span>Already have</span>
          </div>
        </article>
        <article className="kf-landing-bento-card">
          <p className="kf-landing-field-label">Preferences that matter</p>
          <h3 className="display text-3xl">Your food rules aren&apos;t suggestions.</h3>
          <p>Allergies stay hard rules. Diets and cravings shape what shows up.</p>
          <div className="kf-landing-tag-row">
            {["Vegetarian", "Vegan", "Gluten free", "Dairy free", "High protein"].map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </article>
        <article className="kf-landing-bento-card">
          <p className="kf-landing-field-label">Your equipment</p>
          <h3 className="display text-3xl">Built for the tools you own.</h3>
          <div className="kf-landing-tag-row">
            {["Oven", "Air fryer", "Stovetop", "Slow cooker", "Instant Pot"].map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export function PrivacySection() {
  return (
    <section className="kf-landing-section kf-landing-privacy">
      <div className="kf-landing-privacy-inner">
        <p className="kf-eyebrow">Privacy</p>
        <h2 className="display kf-landing-h2">Your kitchen is personal. Your data should be too.</h2>
        <p className="kf-landing-lede">
          Kitchen photos can feel private. You can delete scans, inventory, and your account anytime from Settings.
          We don&apos;t sell your kitchen data.
        </p>
        <Link href="/privacy" className="kf-landing-text-link">
          Read our privacy details
        </Link>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="kf-landing-section kf-landing-faq" id="faq">
      <div className="kf-landing-section-head">
        <p className="kf-eyebrow">FAQ</p>
        <h2 className="display kf-landing-h2">Questions, answered plainly.</h2>
      </div>
      <div className="kf-landing-faq-list">
        {FAQS.map((item) => (
          <details key={item.q} className="kf-landing-faq-item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="kf-landing-footer">
      <div className="kf-landing-footer-inner">
        <Link href="/" className="kf-landing-brand">
          <span className="kf-landing-brand-mark">
            <SproutIcon size={16} />
          </span>
          <span className="display kf-landing-brand-name">Kitchen Friend</span>
        </Link>
        <nav className="kf-landing-footer-nav" aria-label="Footer">
          <Link href="/recipes">Recipes</Link>
          <Link href="/scan">Scan</Link>
          <Link href="/kitchen">Kitchen</Link>
          <Link href="/shop">Shop</Link>
          <Link href="/tonight">
            <LeafIcon size={14} /> Tonight
          </Link>
          <Link href="/login">Sign in</Link>
          <Link href="/signup">Create account</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <p className="kf-landing-footer-note">Dinner starts with what you already have.</p>
      </div>
    </footer>
  );
}
