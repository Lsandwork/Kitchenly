import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui";
import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({ where: { slug } });
  if (!post || post.status !== "published") return { title: "Post" };
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
  };
}

export const dynamic = "force-dynamic";

function renderMarkdown(markdown: string) {
  // Lightweight markdown → HTML for admin-generated posts (headings + paragraphs + lists).
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      continue;
    }
    if (line.startsWith("### ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<h3>${escape(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<h2>${escape(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<h1>${escape(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${escape(line.slice(2))}</li>`);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${escape(line.replace(/^\d+\.\s/, ""))}</li>`);
      continue;
    }
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    html.push(`<p>${escape(line)}</p>`);
  }
  if (inList) html.push("</ul>");
  return html.join("\n");
}

function escape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({ where: { slug } });
  if (!post || post.status !== "published") notFound();

  return (
    <PageShell narrow className="space-y-6 py-16">
      <p className="kf-eyebrow">{post.category || "Kitchen notes"}</p>
      <h1 className="display text-5xl font-semibold">{post.title}</h1>
      {post.publishedAt ? (
        <p className="text-[var(--kf-text-muted)]">
          {new Date(post.publishedAt).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      ) : null}
      <div
        className="prose prose-neutral max-w-none space-y-4 text-[1.05rem] leading-relaxed text-[var(--kf-espresso)] [&_h1]:display [&_h1]:text-3xl [&_h2]:display [&_h2]:text-2xl [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(post.bodyMarkdown) }}
      />
      <Link href="/blog" className="inline-block font-semibold text-[var(--kf-olive)]">
        ← All posts
      </Link>
    </PageShell>
  );
}
