import type { Metadata } from "next";
import { MockLanding } from "@/components/landing/mock-landing";

const title = "Kitchen Friend | Turn What You Have Into Dinner";
const description =
  "Scan your fridge, discover meals you can make with what you already have, and make dinner easier with Kitchen Friend.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/",
    siteName: "Kitchen Friend",
    images: [{ url: "/assets/landing-hero-lifestyle.png", width: 1376, height: 768, alt: "Kitchen Friend" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/assets/landing-hero-lifestyle.png"],
  },
};

export default function HomePage() {
  return <MockLanding />;
}
