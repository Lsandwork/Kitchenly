import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { scanPhotos } from "@/services/scan";
import type { KitchenLocation } from "@/domain/types";

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const limited = rateLimit(`scan:${user.id}`, 20, 60_000);
  if (!limited.ok) return fail("Give the scanner a breath — too many photos at once.", 429);

  const form = await request.formData();
  const files = form.getAll("photos").filter((value): value is File => value instanceof File);
  if (!files.length) return fail("Add at least one photo.");
  const location = (form.get("location") as KitchenLocation | null) ?? undefined;
  try {
    const result = await scanPhotos(user.id, files, location);
    return json(result);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "I couldn't read that photo. Tell me what you have instead.";
    const message = /ENOENT|EACCES|mkdir|\/var\/task/i.test(raw)
      ? "I couldn't read that photo right now. Try again, or type what's in your kitchen."
      : raw;
    return fail(message, 400);
  }
}
