import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes from Dishly on cooking with what you already have.",
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await db.blogPost.findMany({
    where: { status: "published" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 24,
  });

  return (
    <PageShell narrow className="space-y-8 py-16">
      <div>
        <p className="kf-eyebrow">Blog</p>
        <h1 className="display mt-3 text-5xl font-semibold">Stories from the kitchen.</h1>
        <p className="mt-3 text-lg text-[var(--kf-text-muted)]">
          Weeknight dinners, fridge rescues, and making the most of what you already have.
        </p>
      </div>

      {posts.length ? (
        <div className="space-y-6">
          {posts.map((post) => (
            <article key={post.id} className="kf-card rounded-[28px] p-5 md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--kf-terracotta)]">
                {post.category || "Kitchen notes"}
                {post.publishedAt
                  ? ` · ${new Date(post.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                  : ""}
              </p>
              <h2 className="display mt-2 text-3xl">
                <Link href={`/blog/${post.slug}`} className="hover:text-[var(--kf-olive)]">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-[var(--kf-text-muted)]">{post.excerpt || "Open for the full story."}</p>
              <Link href={`/blog/${post.slug}`} className="mt-3 inline-block font-semibold text-[var(--kf-olive)]">
                Read more →
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-lg text-[var(--kf-text-muted)]">
          We&apos;re cooking up the first posts. Check back soon — or generate one from the Admin Panel.
        </p>
      )}

      <Link href="/" className="font-semibold text-[var(--kf-olive)]">
        ← Back to Dishly
      </Link>
    </PageShell>
  );
}
