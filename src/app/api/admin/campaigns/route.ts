import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { recordAudit } from "@/services/admin/activity";

function mapCampaign(row: {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  bodyHtml: string;
  status: string;
  scheduledFor: Date | null;
  sentAt: Date | null;
  statsJson: string;
}) {
  let stats: Record<string, number> = {};
  try {
    stats = JSON.parse(row.statsJson || "{}") as Record<string, number>;
  } catch {
    stats = {};
  }
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    previewText: row.previewText,
    bodyHtml: row.bodyHtml,
    status: row.status,
    scheduledFor: row.scheduledFor?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    stats,
  };
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return fail("Admin access required.", 401);
  }

  const campaigns = await db.emailCampaign.findMany({
    orderBy: { updatedAt: "desc" },
    take: 80,
  });
  return json({ campaigns: campaigns.map(mapCampaign) });
}

const BodySchema = z.object({
  action: z.enum(["list", "create", "schedule", "send"]),
  id: z.string().optional(),
  name: z.string().optional(),
  subject: z.string().optional(),
  previewText: z.string().optional(),
  bodyHtml: z.string().optional(),
  scheduledFor: z.string().optional(),
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
    if (body.action === "create") {
      const name = (body.name || "").trim();
      const subject = (body.subject || "").trim();
      if (!name || !subject) return fail("Name and subject required.");
      const campaign = await db.emailCampaign.create({
        data: {
          name,
          subject,
          previewText: body.previewText || "",
          bodyHtml: body.bodyHtml || "",
          status: "draft",
        },
      });
      await recordAudit({
        actorId: admin.id,
        action: "campaign.create",
        targetType: "campaign",
        targetId: campaign.id,
      });
      return json({ campaign: mapCampaign(campaign) });
    }

    if (body.action === "schedule") {
      if (!body.id) return fail("id required.");
      const scheduledFor = body.scheduledFor
        ? new Date(body.scheduledFor)
        : new Date(Date.now() + 86400000);
      const campaign = await db.emailCampaign.update({
        where: { id: body.id },
        data: { status: "scheduled", scheduledFor },
      });
      await recordAudit({
        actorId: admin.id,
        action: "campaign.schedule",
        targetType: "campaign",
        targetId: campaign.id,
      });
      return json({ campaign: mapCampaign(campaign) });
    }

    if (body.action === "send") {
      if (!body.id) return fail("id required.");
      const existing = await db.emailCampaign.findUnique({ where: { id: body.id } });
      if (!existing) return fail("Campaign not found.", 404);

      const recipients = await db.user.findMany({
        where: { deletedAt: null, email: { not: null }, passwordHash: { not: null } },
        select: { id: true, email: true },
        take: 500,
      });

      for (const user of recipients) {
        if (!user.email) continue;
        await db.emailSendLog.create({
          data: {
            userId: user.id,
            toEmail: user.email,
            kind: "campaign",
            subject: existing.subject,
            payloadJson: JSON.stringify({ campaignId: existing.id }),
            status: "queued",
          },
        });
      }

      const campaign = await db.emailCampaign.update({
        where: { id: body.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          statsJson: JSON.stringify({
            sent: recipients.length,
            opened: 0,
            clicked: 0,
            bounced: 0,
          }),
        },
      });
      await recordAudit({
        actorId: admin.id,
        action: "campaign.send",
        targetType: "campaign",
        targetId: campaign.id,
        detail: { recipients: recipients.length },
      });
      return json({ campaign: mapCampaign(campaign) });
    }

    if (body.action === "list") {
      const campaigns = await db.emailCampaign.findMany({ orderBy: { updatedAt: "desc" }, take: 80 });
      return json({ campaigns: campaigns.map(mapCampaign) });
    }

    return fail("Unknown action.");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Campaign request failed.");
  }
}
