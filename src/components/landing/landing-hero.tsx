"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { KitchenDemo } from "@/components/landing/kitchen-demo";
import { useLandingUser } from "@/components/landing/use-landing-user";
import { trackLanding } from "@/lib/landing-analytics";

export function LandingHero() {
  const user = useLandingUser();
  const primaryHref = user.guest ? "/signup" : "/tonight";
  const primaryLabel = user.guest ? "Start cooking free" : "Open Kitchen";

  return (
    <section className="kf-landing-hero">
      <div className="kf-landing-hero-copy">
        <p className="kf-eyebrow">Your kitchen already knows dinner.</p>
        <h1 className="display kf-landing-hero-title">Dinner starts with what you already have.</h1>
        <p className="kf-landing-hero-lede">
          Show Dishly what&apos;s in your fridge and pantry. We&apos;ll help you turn it into something worth
          eating — and tell you exactly what&apos;s missing.
        </p>
        <div className="kf-landing-hero-actions">
          <ButtonLink
            href={primaryHref}
            tone="olive"
            className="min-h-14 px-7 text-[1.05rem]"
            onClick={() =>
              trackLanding(user.guest ? "hero_signup_click" : "open_kitchen_click", { source: "hero" })
            }
          >
            {primaryLabel}
          </ButtonLink>
          <ButtonLink
            href="#how-it-works"
            tone="secondary"
            className="min-h-14 px-7 text-[1.05rem]"
            onClick={() => trackLanding("hero_demo_click", { source: "hero" })}
          >
            See how it works
          </ButtonLink>
        </div>
        <p className="kf-landing-hero-proof">Save your kitchen · Personalized recipes · Smarter shopping</p>
      </div>
      <KitchenDemo />
      <Link href="#whats-in-your-kitchen" className="sr-only">
        Skip to ingredient picker
      </Link>
    </section>
  );
}
