"use client";

import { useEffect } from "react";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { IngredientMatcher } from "@/components/landing/ingredient-matcher";
import { PersonalizationDemo } from "@/components/landing/personalization-demo";
import {
  AccountBenefits,
  FinalCta,
  RecipePreview,
  TonightFeature,
} from "@/components/landing/conversion-sections";
import {
  FeatureBento,
  HowItWorks,
  LandingFooter,
  PrivacySection,
  ProblemComparison,
  FaqSection,
} from "@/components/landing/static-sections";
import type { LandingRecipe } from "@/components/landing/types";
import { useLandingUser } from "@/components/landing/use-landing-user";
import { trackLanding } from "@/lib/landing-analytics";

export function LandingPage({ recipes }: { recipes: LandingRecipe[] }) {
  const user = useLandingUser();

  useEffect(() => {
    trackLanding("landing_view");
  }, []);

  const stickyHref = user.guest ? "/signup" : "/tonight";
  const stickyLabel = user.guest ? "Start cooking free" : "Open Kitchen";

  return (
    <div className="kf-landing">
      <LandingHeader />
      <main>
        <LandingHero />
        <ProblemComparison />
        <HowItWorks />
        <IngredientMatcher />
        <FeatureBento />
        <TonightFeature />
        <RecipePreview recipes={recipes} />
        <PersonalizationDemo />
        <AccountBenefits />
        <PrivacySection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
      <div className="kf-landing-mobile-cta md:hidden">
        <a
          href={stickyHref}
          className="kf-landing-mobile-cta-btn"
          onClick={() =>
            trackLanding(user.guest ? "signup_cta_click" : "open_kitchen_click", {
              source: "mobile_sticky",
            })
          }
        >
          {stickyLabel}
        </a>
      </div>
    </div>
  );
}
