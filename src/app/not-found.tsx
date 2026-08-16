import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="display text-4xl">That page wandered off.</h1>
      <p className="mt-3 text-lg text-ink-soft">Let&apos;s go back to the kitchen and figure out dinner.</p>
      <Link href="/" className="mt-6 inline-flex min-h-12 items-center font-bold text-terracotta">
        What&apos;s for dinner?
      </Link>
    </main>
  );
}
