import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { configuredAI } from "@/providers/ai";
import { recordAudit } from "@/services/admin/activity";

function mapPost(post: {
  id: string;
  platform: string;
  caption: string;
  status: string;
  scheduledFor: Date | null;
  publishedAt: Date | null;
  linkedBlogId: string | null;
  createdAt: Date;
}) {
  return {
    id: post.id,
    platform: post.platform,
    caption: post.caption,
    status: post.status,
    scheduledFor: post.scheduledFor?.toISOString() ?? null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    linkedBlogId: post.linkedBlogId,
    createdAt: post.createdAt.toISOString(),
  };
}

async function generateCaption(platform: string, topic: string, blogTitle?: string | null) {
  const ai = configuredAI();
  const subject = blogTitle ? `blog post "${blogTitle}"` : topic || "weeknight cooking";
  const prompt = `Write a ${platform} caption for Kitchen Friend about ${subject}. Friendly, useful, 1-3 short paragraphs + 3-6 hashtags. No quotes around the whole caption.`;

  if (ai) {
    try {
      const text = await ai.completeText("fast", [
        {
          role: "system",
          content: "You write social captions for Kitchen Friend, a fridge-to-dinner cooking app.",
        },
        { role: "user", content: prompt },
      ]);
      if (text?.trim()) return text.trim();
    } catch {
      // template fallback
    }
  }

  return `What's for dinner when the fridge looks random? Kitchen Friend matches recipes to what you already have — starting with ${topic || "tonight's leftovers"}.

Open the app, scan once, cook sooner. 🌿

#KitchenFriend #WeeknightDinner #CookWhatYouHave #HomeCooking`;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return fail("Admin access required.", 401);
  }

  const posts = await db.socialPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return json({ posts: posts.map(mapPost) });
}

const BodySchema = z.object({
  action: z.enum(["list", "generate", "schedule", "create"]),
  platform: z.string().optional(),
  topic: z.string().optional(),
  caption: z.string().optional(),
  linkedBlogId: z.string().optional(),
  scheduledFor: z.string().optional(),
  id: z.string().optional(),
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
  const platform = (body.platform || "instagram").toLowerCase();

  try {
    if (body.action === "generate") {
      let blogTitle: string | null = null;
      if (body.linkedBlogId) {
        const blog = await db.blogPost.findUnique({ where: { id: body.linkedBlogId } });
        blogTitle = blog?.title ?? null;
      }
      const caption = await generateCaption(platform, body.topic || "", blogTitle);
      const post = await db.socialPost.create({
        data: {
          platform,
          caption,
          status: "draft",
          linkedBlogId: body.linkedBlogId || null,
          authorId: admin.id,
        },
      });
      await recordAudit({
        actorId: admin.id,
        action: "social.generate",
        targetType: "social",
        targetId: post.id,
      });
      return json({ post: mapPost(post) });
    }

    if (body.action === "schedule" || body.action === "create") {
      const caption = (body.caption || "").trim();
      if (!caption) return fail("Caption required.");
      const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : new Date(Date.now() + 3600000);
      const post = await db.socialPost.create({
        data: {
          platform,
          caption,
          status: "scheduled",
          scheduledFor,
          linkedBlogId: body.linkedBlogId || null,
          authorId: admin.id,
        },
      });
      await recordAudit({
        actorId: admin.id,
        action: "social.schedule",
        targetType: "social",
        targetId: post.id,
      });
      return json({ post: mapPost(post) });
    }

    if (body.action === "list") {
      const posts = await db.socialPost.findMany({ orderBy: { createdAt: "desc" }, take: 80 });
      return json({ posts: posts.map(mapPost) });
    }

    return fail("Unknown action.");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Social request failed.");
  }
}
