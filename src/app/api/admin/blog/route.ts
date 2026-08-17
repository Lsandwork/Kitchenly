import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { configuredAI } from "@/providers/ai";
import { recordAudit } from "@/services/admin/activity";

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return base || `post-${nanoid(6)}`;
}

async function uniqueSlug(title: string) {
  let slug = slugify(title);
  let i = 0;
  while (await db.blogPost.findUnique({ where: { slug } })) {
    i += 1;
    slug = `${slugify(title)}-${i}`;
  }
  return slug;
}

function mapPost(post: {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  status: string;
  category: string | null;
  scheduledFor: Date | null;
  publishedAt: Date | null;
  updatedAt: Date;
}) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    bodyMarkdown: post.bodyMarkdown,
    status: post.status,
    category: post.category,
    scheduledFor: post.scheduledFor?.toISOString() ?? null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    updatedAt: post.updatedAt.toISOString(),
  };
}

async function generateMarkdown(topic: string, tone: string, length: string) {
  const ai = configuredAI();
  const lengthHint =
    length === "short" ? "400-600 words" : length === "long" ? "1200-1600 words" : "700-1000 words";
  const system = `You are Dishly's blog writer. Warm, practical cooking advice. Olive-kitchen vibe. Output markdown only with a # title, short intro, and helpful sections. No JSON.`;
  const prompt = `Write a ${lengthHint} blog post about: ${topic}\nTone: ${tone}\nAudience: home cooks using what's already in the fridge.`;

  if (ai) {
    try {
      const text = await ai.completeText("reasoning", [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ]);
      if (text?.trim()) return text.trim();
    } catch {
      // fall through to template
    }
  }

  return `# ${topic.trim() || "Tonight from your kitchen"}

Cooking with what you already have is the Dishly way.

## Why this works
A ${tone.replace(/_/g, " ")} approach keeps dinner decisions light: start with leftovers, add one fresh element, and finish with a simple sauce.

## Steps
1. Pull proteins and produce from the fridge.
2. Choose a carb you already have (rice, pasta, tortillas).
3. Season boldly with pantry staples.
4. Plate and note what to shop next time.

## Dishly tip
Scan your fridge before you decide — matching recipes to ingredients beats scrolling endlessly.

*Draft generated for topic: ${topic}*
`;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return fail("Admin access required.", 401);
  }

  const status = request.nextUrl.searchParams.get("status")?.trim();
  const posts = await db.blogPost.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return json({ posts: posts.map(mapPost) });
}

const BodySchema = z.object({
  action: z.enum(["list", "create", "update", "updateStatus", "generate", "publish"]),
  id: z.string().optional(),
  title: z.string().optional(),
  bodyMarkdown: z.string().optional(),
  excerpt: z.string().optional(),
  status: z.string().optional(),
  scheduledFor: z.string().optional(),
  topic: z.string().optional(),
  tone: z.string().optional(),
  length: z.string().optional(),
  category: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return fail("Admin access required.", 401);
  }

  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) return fail("Invalid request.");
  const body = parsed.data;

  try {
    if (body.action === "generate") {
      const topic = (body.topic || "").trim() || "Weeknight leftovers";
      const markdown = await generateMarkdown(topic, body.tone || "warm_practical", body.length || "medium");
      const titleLine = markdown.split("\n").find((line) => line.startsWith("# "));
      const title = titleLine ? titleLine.replace(/^#\s+/, "").trim() : topic;
      const slug = await uniqueSlug(title);
      const post = await db.blogPost.create({
        data: {
          slug,
          title,
          excerpt: `Dishly guide: ${topic}`,
          bodyMarkdown: markdown,
          status: "draft",
          category: body.category || "cooking",
          authorId: admin.id,
        },
      });
      await recordAudit({
        actorId: admin.id,
        action: "blog.generate",
        targetType: "blog",
        targetId: post.id,
        detail: { topic },
      });
      return json({ post: mapPost(post) });
    }

    if (body.action === "create") {
      const title = (body.title || "").trim();
      if (!title) return fail("Title required.");
      const slug = await uniqueSlug(title);
      const post = await db.blogPost.create({
        data: {
          slug,
          title,
          excerpt: body.excerpt || "",
          bodyMarkdown: body.bodyMarkdown || "",
          status: body.status || "draft",
          category: body.category || null,
          authorId: admin.id,
        },
      });
      return json({ post: mapPost(post) });
    }

    if (body.action === "update" || body.action === "updateStatus" || body.action === "publish") {
      if (!body.id) return fail("id required.");
      const existing = await db.blogPost.findUnique({ where: { id: body.id } });
      if (!existing) return fail("Post not found.", 404);

      const status = body.action === "publish" ? "published" : body.status || existing.status;
      const scheduledFor =
        body.scheduledFor != null && body.scheduledFor !== ""
          ? new Date(body.scheduledFor)
          : status === "scheduled"
            ? existing.scheduledFor
            : null;

      const post = await db.blogPost.update({
        where: { id: body.id },
        data: {
          ...(body.title != null ? { title: body.title } : {}),
          ...(body.bodyMarkdown != null ? { bodyMarkdown: body.bodyMarkdown } : {}),
          ...(body.excerpt != null ? { excerpt: body.excerpt } : {}),
          ...(body.category != null ? { category: body.category } : {}),
          status,
          scheduledFor: status === "scheduled" ? scheduledFor : status === "published" ? null : existing.scheduledFor,
          publishedAt: status === "published" ? existing.publishedAt || new Date() : existing.publishedAt,
        },
      });
      await recordAudit({
        actorId: admin.id,
        action: `blog.${body.action}`,
        targetType: "blog",
        targetId: post.id,
        detail: { status },
      });
      return json({ post: mapPost(post) });
    }

    if (body.action === "list") {
      const posts = await db.blogPost.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });
      return json({ posts: posts.map(mapPost) });
    }

    return fail("Unknown action.");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Blog request failed.");
  }
}
