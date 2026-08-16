import { Suspense } from "react";
import { HomeExperience } from "@/components/home-experience";

export const metadata = {
  title: "Tonight | Kitchen Friend",
  description: "Figure out dinner from what’s already in your kitchen.",
  robots: { index: false, follow: true },
};

export default function TonightPage() {
  return (
    <Suspense fallback={<main className="kf-page py-16 text-[var(--kf-text-muted)]">Warming the kitchen...</main>}>
      <HomeExperience />
    </Suspense>
  );
}
