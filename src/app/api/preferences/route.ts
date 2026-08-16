import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { getPreferences, updatePreferences } from "@/services/kitchen";

export async function GET() {
  const user = await requireUser();
  return json({ prefs: await getPreferences(user.id) });
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const body = await request.json();
  await updatePreferences(user.id, body);
  return json({ prefs: await getPreferences(user.id) });
}
