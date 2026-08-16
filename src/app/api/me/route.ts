import { NextRequest } from "next/server";
import { z } from "zod";
import { deleteAccount, login, logout, register, requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getKitchen, getPreferences } from "@/services/kitchen";
import { aiStatus } from "@/providers/ai";
import { shoppingProviderStatus } from "@/providers/shopping";
import { availableRecipeSources } from "@/providers/recipes";

export async function GET() {
  const user = await requireUser();
  const [kitchen, prefs] = await Promise.all([getKitchen(user.id), getPreferences(user.id)]);
  return json({
    user,
    prefs,
    kitchen,
    capabilities: {
      ai: aiStatus(),
      shopping: shoppingProviderStatus(),
      recipes: availableRecipeSources(),
    },
  });
}

const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const action = body.action as string;
  try {
    if (action === "register") {
      const parsed = AuthSchema.parse(body);
      await register(parsed.email, parsed.password, parsed.name);
      return json({ ok: true });
    }
    if (action === "login") {
      const parsed = AuthSchema.pick({ email: true, password: true }).parse(body);
      await login(parsed.email, parsed.password);
      return json({ ok: true });
    }
    if (action === "logout") {
      await logout();
      return json({ ok: true });
    }
    if (action === "delete") {
      const user = await requireUser();
      await deleteAccount(user.id);
      return json({ ok: true });
    }
    return fail("Unknown action");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "That didn't work.", 400);
  }
}
