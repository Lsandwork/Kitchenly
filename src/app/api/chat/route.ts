import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { ChatRequestSchema, converse } from "@/services/conversation";

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!rateLimit(`chat:${user.id}`, 40, 60_000).ok) {
    return fail("I'm still chewing on the last thing you said.", 429);
  }
  const parsed = ChatRequestSchema.safeParse(await request.json());
  if (!parsed.success) return fail("Say that again?");
  const result = await converse(user.id, parsed.data.message, parsed.data.conversationId);
  return json(result);
}
