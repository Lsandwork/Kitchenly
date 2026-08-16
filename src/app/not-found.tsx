import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="display text-4xl">That page wandered off.</h1>
      <p className="mt-3 text-lg text-[var(--kf-text-muted)]">Let&apos;s go back to the kitchen and figure out dinner.</p>
      <ButtonLink href="/tonight" tone="olive" className="mt-6">
        What&apos;s for dinner?
      </ButtonLink>
      <div className="mt-4">
        <Link href="/kitchen" className="font-semibold text-[var(--kf-terracotta)]">
          Or check the kitchen
        </Link>
      </div>
    </main>
  );
}
