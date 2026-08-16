import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return fail("Admin access required.", 401);
  }

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    users,
    guests,
    active7d,
    blogDrafts,
    blogScheduled,
    blogPublished,
    socialScheduled,
    campaigns,
    scans24h,
    cooks24h,
    recent,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null, email: { not: null }, passwordHash: { not: null } } }),
    db.user.count({ where: { deletedAt: null, OR: [{ email: null }, { passwordHash: null }] } }),
    db.user.count({ where: { deletedAt: null, lastSeenAt: { gte: weekAgo } } }),
    db.blogPost.count({ where: { status: "draft" } }),
    db.blogPost.count({ where: { status: "scheduled" } }),
    db.blogPost.count({ where: { status: "published" } }),
    db.socialPost.count({ where: { status: "scheduled" } }),
    db.emailCampaign.count(),
    db.kitchenScan.count({ where: { createdAt: { gte: dayAgo } } }),
    db.cookHistory.count({ where: { cookedAt: { gte: dayAgo } } }),
    db.userActivityEvent.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    }),
  ]);

  return json({
    kpis: {
      users,
      guests,
      active7d,
      blogDrafts,
      blogScheduled,
      blogPublished,
      socialScheduled,
      campaigns,
      scans24h,
      cooks24h,
    },
    recentActivity: recent.map((row) => ({
      id: row.id,
      type: row.type,
      path: row.path,
      createdAt: row.createdAt.toISOString(),
      userEmail: row.user?.email ?? null,
    })),
    counts: {
      drafts: blogDrafts,
      scheduled: blogScheduled,
      published: blogPublished,
      users,
      campaigns,
    },
  });
}

export async function POST() {
  return GET();
}
