"use client";

import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import type { LandingRecipe } from "@/components/landing/types";
import { useLandingUser } from "@/components/landing/use-landing-user";
import { trackLanding } from "@/lib/landing-analytics";

export function RecipePreview({ recipes }: { recipes: LandingRecipe[] }) {
  return (
    <section className="kf-landing-section">
      <div className="kf-landing-section-head">
        <p className="kf-eyebrow">Recipes</p>
        <h2 className="display kf-landing-h2">Recipes that meet you halfway.</h2>
        <p className="kf-landing-lede">
          Find dinner based on ingredients, time, cravings and the kitchen you&apos;re already standing in.
        </p>
      </div>
      <div className="kf-landing-recipe-grid">
        {recipes.map((recipe) => (
          <Link
            key={recipe.slug}
            href={`/recipes/${recipe.slug}`}
            className="kf-landing-recipe-card"
            onClick={() => trackLanding("recipe_preview_click", { slug: recipe.slug })}
          >
            <div className="kf-landing-recipe-media">
              <Image src={recipe.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 360px" className="object-cover" />
            </div>
            <div className="kf-landing-recipe-body">
              <p className="kf-landing-recipe-meta">
                {recipe.totalMinutes} min · {recipe.difficulty}
              </p>
              <h3 className="display">{recipe.title}</h3>
              <p>{recipe.description}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <ButtonLink href="/recipes" tone="olive" className="min-h-14 px-7">
          Explore all recipes
        </ButtonLink>
      </div>
    </section>
  );
}

export function TonightFeature() {
  const user = useLandingUser();
  const href = user.guest ? "/signup" : "/tonight";

  return (
    <section className="kf-landing-section kf-landing-tonight">
      <div className="kf-landing-tonight-inner">
        <p className="kf-eyebrow">Tonight</p>
        <h2 className="display kf-landing-h2 kf-landing-tonight-title">
          The hardest question in the kitchen shouldn&apos;t be &ldquo;what are we eating?&rdquo;
        </h2>
        <p className="kf-landing-lede">
          Kitchen Friend looks at your kitchen and helps narrow dinner down to something you can actually make
          tonight.
        </p>
        <ButtonLink
          href={href}
          tone="ask"
          className="min-h-14 px-7"
          onClick={() => trackLanding("tonight_cta_click", { guest: user.guest })}
        >
          Figure out dinner
        </ButtonLink>
      </div>
    </section>
  );
}

export function AccountBenefits() {
  const user = useLandingUser();
  if (!user.guest && user.loaded) {
    return (
      <section className="kf-landing-section kf-landing-account">
        <div className="kf-landing-section-head">
          <p className="kf-eyebrow">Your kitchen</p>
          <h2 className="display kf-landing-h2">Welcome back. Tonight is waiting.</h2>
          <p className="kf-landing-lede">Your kitchen, preferences, and shopping list are ready when you are.</p>
        </div>
        <div className="mt-8 flex justify-center">
          <ButtonLink
            href="/tonight"
            tone="olive"
            className="min-h-14 px-8 text-[1.05rem]"
            onClick={() => trackLanding("open_kitchen_click", { source: "account_benefits" })}
          >
            Open Kitchen
          </ButtonLink>
        </div>
      </section>
    );
  }

  return (
    <section className="kf-landing-section kf-landing-account">
      <div className="kf-landing-section-head">
        <p className="kf-eyebrow">Why create an account</p>
        <h2 className="display kf-landing-h2">Your Kitchen Friend gets better when it knows your kitchen.</h2>
      </div>
      <div className="kf-landing-account-grid">
        {[
          ["Remember my kitchen", "Save ingredients and inventory so tomorrow starts smarter."],
          ["Remember how I eat", "Save allergies and preferences — allergies stay hard rules."],
          ["Remember how I cook", "Save appliances, servings, and weeknight timing."],
          ["Keep my recipes", "Save favorites and return to what worked."],
          ["Keep my shopping organized", "Carry missing ingredients into a focused list."],
        ].map(([title, body]) => (
          <article key={title} className="kf-landing-account-card">
            <h3 className="display text-2xl">{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <ButtonLink
          href="/signup"
          tone="olive"
          className="min-h-14 px-8 text-[1.05rem]"
          onClick={() => trackLanding("signup_cta_click", { source: "account_benefits" })}
        >
          Create my kitchen
        </ButtonLink>
      </div>
    </section>
  );
}

export function FinalCta() {
  const user = useLandingUser();
  const href = user.guest ? "/signup" : "/tonight";
  const label = user.guest ? "Create my kitchen" : "Open Kitchen";

  return (
    <section className="kf-landing-final">
      <h2 className="display kf-landing-final-title">Your next dinner might already be in your kitchen.</h2>
      <p className="kf-landing-lede">Let&apos;s find it.</p>
      <div className="kf-landing-final-actions">
        <ButtonLink
          href={href}
          tone="olive"
          className="min-h-16 px-10 text-[1.12rem]"
          onClick={() =>
            trackLanding(user.guest ? "final_signup_click" : "open_kitchen_click", { source: "final" })
          }
        >
          {label}
        </ButtonLink>
        <ButtonLink href="/recipes" tone="secondary" className="min-h-14 px-7">
          Browse recipes first
        </ButtonLink>
      </div>
    </section>
  );
}
