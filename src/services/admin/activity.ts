import { db } from "@/lib/db";

export async function recordActivity(input: {
  userId?: string | null;
  type: string;
  path?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await db.userActivityEvent.create({
      data: {
        userId: input.userId || null,
        type: input.type,
        path: input.path || null,
        metaJson: JSON.stringify(input.meta ?? {}),
      },
    });
  } catch {
    // Activity tracking must never break product flows.
  }
}

export async function recordAnalytics(input: {
  userId?: string | null;
  event: string;
  path?: string | null;
  referrer?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await db.analyticsEvent.create({
      data: {
        userId: input.userId || null,
        event: input.event,
        path: input.path || null,
        referrer: input.referrer || null,
        metaJson: JSON.stringify(input.meta ?? {}),
      },
    });
  } catch {
    // ignore
  }
}

export async function recordAudit(input: {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
}) {
  try {
    await db.adminAuditLog.create({
      data: {
        actorId: input.actorId || null,
        action: input.action,
        targetType: input.targetType || null,
        targetId: input.targetId || null,
        detailJson: JSON.stringify(input.detail ?? {}),
      },
    });
  } catch {
    // ignore
  }
}
