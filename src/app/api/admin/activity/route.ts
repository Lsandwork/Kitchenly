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

  const type = request.nextUrl.searchParams.get("type")?.trim();
  const events = await db.userActivityEvent.findMany({
    where: type ? { type: { contains: type, mode: "insensitive" } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 150,
    include: { user: { select: { email: true } } },
  });

  return json({
    events: events.map((row) => {
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(row.metaJson || "{}") as Record<string, unknown>;
      } catch {
        meta = {};
      }
      return {
        id: row.id,
        type: row.type,
        path: row.path,
        userId: row.userId,
        userEmail: row.user?.email ?? null,
        meta,
        createdAt: row.createdAt.toISOString(),
      };
    }),
  });
}
