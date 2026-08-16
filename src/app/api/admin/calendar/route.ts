import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return fail("Admin access required.", 401);
  }

  const startParam = request.nextUrl.searchParams.get("start");
  const endParam = request.nextUrl.searchParams.get("end");
  const start = startParam ? new Date(startParam) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endParam
    ? new Date(endParam)
    : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  const [blogs, socials, campaigns] = await Promise.all([
    db.blogPost.findMany({
      where: {
        OR: [
          { scheduledFor: { gte: start, lte: end } },
          { publishedAt: { gte: start, lte: end } },
        ],
      },
      select: { id: true, title: true, status: true, scheduledFor: true, publishedAt: true },
    }),
    db.socialPost.findMany({
      where: {
        OR: [
          { scheduledFor: { gte: start, lte: end } },
          { publishedAt: { gte: start, lte: end } },
        ],
      },
      select: { id: true, platform: true, caption: true, status: true, scheduledFor: true, publishedAt: true },
    }),
    db.emailCampaign.findMany({
      where: {
        OR: [
          { scheduledFor: { gte: start, lte: end } },
          { sentAt: { gte: start, lte: end } },
        ],
      },
      select: { id: true, name: true, status: true, scheduledFor: true, sentAt: true },
    }),
  ]);

  const events = [
    ...blogs.map((row) => ({
      id: `blog-${row.id}`,
      kind: "blog" as const,
      title: row.title,
      status: row.status,
      at: (row.scheduledFor || row.publishedAt || new Date()).toISOString(),
    })),
    ...socials.map((row) => ({
      id: `social-${row.id}`,
      kind: "social" as const,
      title: `${row.platform}: ${row.caption.slice(0, 48)}`,
      status: row.status,
      at: (row.scheduledFor || row.publishedAt || new Date()).toISOString(),
    })),
    ...campaigns.map((row) => ({
      id: `campaign-${row.id}`,
      kind: "campaign" as const,
      title: row.name,
      status: row.status,
      at: (row.scheduledFor || row.sentAt || new Date()).toISOString(),
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return json({ events, start: start.toISOString(), end: end.toISOString() });
}
