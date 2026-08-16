import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, PageShell } from "@/components/ui";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Kitchen Friend is free to start. Create your kitchen and cook with what you have.",
};

export default function PricingPage() {
  return (
    <PageShell narrow className="space-y-8 py-16">
      <p className="kf-eyebrow">Pricing</p>
      <h1 className="display text-5xl font-semibold">Start free. Cook smarter.</h1>
      <p className="text-lg text-[var(--kf-text-muted)]">
        Create your Kitchen Friend account at no cost. Scan your kitchen, get Kitchen Match recipes, and shop only for
        what&apos;s missing.
      </p>
      <div className="kf-card rounded-[28px] p-6 space-y-3">
        <h2 className="display text-3xl">Free to cook</h2>
        <ul className="space-y-2 text-[var(--kf-text-muted)]">
          <li>· Scan fridge and pantry</li>
          <li>· Kitchen Match recipes</li>
          <li>· Preferences and allergies</li>
          <li>· Smart shopping lists</li>
        </ul>
        <ButtonLink href="/signup" tone="olive" className="mt-4">
          Get started free
        </ButtonLink>
      </div>
      <Link href="/" className="font-semibold text-[var(--kf-olive)]">
        ← Back to Kitchen Friend
      </Link>
    </PageShell>
  );
}
