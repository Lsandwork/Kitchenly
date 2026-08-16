import { NextRequest } from "next/server";
import { z } from "zod";
import {
  changePassword,
  clearSessionCookie,
  deleteAccount,
  ensureAdminUser,
  login,
  logout,
  register,
  requireUser,
  signupNew,
  withSessionCookie,
} from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getKitchen, getPreferences } from "@/services/kitchen";
import { aiStatus } from "@/providers/ai";
import { shoppingProviderStatus } from "@/providers/shopping";
import { availableRecipeSources } from "@/providers/recipes";
import { recordActivity } from "@/services/admin/activity";

export async function GET() {
  // Keep admin account healthy in local/prod without wiping kitchens on every request.
  await ensureAdminUser().catch(() => undefined);
  const user = await requireUser();
  const [kitchen, prefs] = await Promise.all([getKitchen(user.id), getPreferences(user.id)]);
  void recordActivity({
    userId: user.id,
    type: "session_ping",
    path: "/api/me",
    meta: { guest: user.guest, role: user.role },
  });
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

const PasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const action = body.action as string;
  try {
    if (action === "register" || action === "signup") {
      const parsed = AuthSchema.parse(body);
      const user =
        action === "signup"
          ? await signupNew(parsed.email, parsed.password, parsed.name)
          : await register(parsed.email, parsed.password, parsed.name);
      void recordActivity({
        userId: user.id,
        type: action === "signup" ? "signup" : "register",
        path: "/api/me",
        meta: { email: user.email },
      });
      return withSessionCookie(user.id, { ok: true, user });
    }
    if (action === "login") {
      const parsed = AuthSchema.pick({ email: true, password: true }).parse(body);
      const user = await login(parsed.email, parsed.password);
      void recordActivity({
        userId: user.id,
        type: "login",
        path: "/api/me",
        meta: { email: user.email, role: user.role },
      });
      return withSessionCookie(user.id, { ok: true, user });
    }
    if (action === "change_password") {
      const user = await requireUser();
      if (user.guest) return fail("Create an account before changing your password.", 401);
      const parsed = PasswordSchema.parse(body);
      await changePassword(user.id, parsed.currentPassword, parsed.newPassword);
      return json({ ok: true, message: "Password updated.", user });
    }
    if (action === "logout") {
      await logout();
      return clearSessionCookie({ ok: true });
    }
    if (action === "delete") {
      const user = await requireUser();
      await deleteAccount(user.id);
      return clearSessionCookie({ ok: true });
    }
    return fail("Unknown action");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "That didn't work.", 400);
  }
}
