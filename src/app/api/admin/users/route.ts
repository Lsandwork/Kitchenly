import { NextRequest } from "next/server";
import { z } from "zod";
import {
  adminResetTemporaryPassword,
  adminSetPassword,
  requireAdmin,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { recordAudit } from "@/services/admin/activity";

export async function GET(request: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return fail("Admin access required.", 401);
  }

  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });

  void admin;
  return json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role === "admin" ? "admin" : "user",
      guest: !u.email || !u.passwordHash,
      lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

const BodySchema = z.object({
  action: z.enum(["setPassword", "resetTemporaryPassword", "setRole"]),
  userId: z.string().min(1),
  password: z.string().optional(),
  role: z.enum(["user", "admin"]).optional(),
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

  const { action, userId } = parsed.data;
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.deletedAt) return fail("User not found.", 404);

  try {
    if (action === "setPassword") {
      const password = parsed.data.password || "";
      await adminSetPassword(userId, password);
      await recordAudit({
        actorId: admin.id,
        action: "admin.set_password",
        targetType: "user",
        targetId: userId,
      });
      return json({ ok: true });
    }

    if (action === "resetTemporaryPassword") {
      const temporaryPassword = await adminResetTemporaryPassword(userId);
      await recordAudit({
        actorId: admin.id,
        action: "admin.reset_temp_password",
        targetType: "user",
        targetId: userId,
      });
      return json({ ok: true, temporaryPassword });
    }

    if (action === "setRole") {
      const role = parsed.data.role;
      if (!role) return fail("Role required.");
      if (role === "admin" && !target.email) return fail("Guests cannot be admins.");
      await db.user.update({ where: { id: userId }, data: { role } });
      await recordAudit({
        actorId: admin.id,
        action: "admin.set_role",
        targetType: "user",
        targetId: userId,
        detail: { role },
      });
      return json({ ok: true, role });
    }

    return fail("Unknown action.");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Request failed.");
  }
}
