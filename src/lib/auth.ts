import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const COOKIE = "kf_session";
export const ADMIN_EMAIL = "lsand.work@gmail.com";

function adminPasswordFallback() {
  return env().ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
}

/** Prefer ADMIN_PASSWORD env; seed/bootstrap scripts set it when empty. */
export function getAdminPassword() {
  const value = adminPasswordFallback();
  if (!value) throw new Error("ADMIN_PASSWORD is not configured.");
  return value;
}

function secret() {
  return new TextEncoder().encode(env().AUTH_SECRET || "dev-only-change-me-kitchen-friend");
}

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  guest: boolean;
  role: "user" | "admin";
};

async function sign(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

async function setSessionCookie(userId: string) {
  const jwt = await sign(userId);
  (await cookies()).set(COOKIE, jwt, cookieOptions());
  return jwt;
}

/** Attach session cookie directly on a Route Handler response (most reliable). */
export async function withSessionCookie<T>(userId: string, data: T, status = 200) {
  const jwt = await sign(userId);
  const response = NextResponse.json(data, { status });
  response.cookies.set(COOKIE, jwt, cookieOptions());
  return response;
}

export function clearSessionCookie(data: unknown = { ok: true }, status = 200) {
  const response = NextResponse.json(data, { status });
  response.cookies.set(COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}

function toSession(user: { id: string; email: string | null; name: string | null; role?: string | null }): SessionUser {
  const email = user.email?.trim() || null;
  const role = user.role === "admin" || email === ADMIN_EMAIL ? "admin" : "user";
  return {
    id: user.id,
    email,
    name: user.name,
    guest: !email,
    role,
  };
}

export async function readSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = await db.user.findUnique({ where: { id: String(payload.sub) } });
    if (!user || user.deletedAt) return null;
    // Heal admin role if email matches but role drifted.
    if (user.email === ADMIN_EMAIL && user.role !== "admin") {
      await db.user.update({ where: { id: user.id }, data: { role: "admin" } });
      return toSession({ ...user, role: "admin" });
    }
    return toSession(user);
  } catch {
    return null;
  }
}

export async function requireUser() {
  const existing = await readSession();
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
    return existing;
  }
  const guestToken = nanoid();
  const user = await db.user.create({
    data: {
      guestToken,
      name: "Friend",
      role: "user",
      profile: { create: {} },
    },
  });
  await setSessionCookie(user.id);
  return toSession(user);
}

export async function requireAdmin() {
  const user = await readSession();
  if (!user || user.guest || user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  return user;
}

export async function register(email: string, password: string, name?: string) {
  const normalized = email.trim().toLowerCase();
  if (password.length < 8) throw new Error("Use at least 8 characters for your password.");

  const taken = await db.user.findUnique({ where: { email: normalized } });
  if (taken?.passwordHash && !taken.deletedAt) {
    throw new Error("That email already has an account. Log in instead.");
  }

  const current = await requireUser();
  const passwordHash = await bcrypt.hash(password, 12);

  if (taken && taken.id !== current.id) {
    throw new Error("That email already has an account. Log in instead.");
  }

  const user = await db.user.update({
    where: { id: current.id },
    data: {
      email: normalized,
      passwordHash,
      name: name?.trim() || current.name || "Friend",
      role: normalized === ADMIN_EMAIL ? "admin" : current.role === "admin" ? "admin" : "user",
    },
  });
  return toSession(user);
}

export async function signupNew(email: string, password: string, name?: string) {
  const normalized = email.trim().toLowerCase();
  if (password.length < 8) throw new Error("Use at least 8 characters for your password.");

  const taken = await db.user.findUnique({ where: { email: normalized } });
  if (taken?.passwordHash && !taken.deletedAt) {
    throw new Error("That email already has an account. Log in instead.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: {
      email: normalized,
      passwordHash,
      name: name?.trim() || "Friend",
      guestToken: nanoid(),
      role: normalized === ADMIN_EMAIL ? "admin" : "user",
      profile: { create: {} },
    },
  });
  return toSession(user);
}

export async function login(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalized } });
  if (!user?.passwordHash || user.deletedAt) throw new Error("That email isn't on a saved kitchen yet.");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error("That password doesn't match.");

  // Keep the canonical admin account elevated + password in sync if they log in as admin email.
  const role = normalized === ADMIN_EMAIL ? "admin" : user.role === "admin" ? "admin" : "user";
  const updated = await db.user.update({
    where: { id: user.id },
    data: { role, lastSeenAt: new Date(), deletedAt: null },
  });
  return toSession(updated);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  if (newPassword.length < 8) throw new Error("Use at least 8 characters for your new password.");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash || user.deletedAt) throw new Error("Create an account before changing your password.");
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new Error("Your current password doesn't match.");
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });
}

export async function adminSetPassword(userId: string, newPassword: string) {
  if (newPassword.length < 8) throw new Error("Use at least 8 characters for the password.");
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 12), deletedAt: null },
  });
}

export async function adminResetTemporaryPassword(userId: string) {
  const temp = `KF-${nanoid(8)}!`;
  await adminSetPassword(userId, temp);
  return temp;
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

export async function deleteAccount(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), email: null, passwordHash: null, name: "Deleted", role: "user" },
  });
  await db.kitchenItem.deleteMany({ where: { userId } });
  await db.kitchenScan.deleteMany({ where: { userId } });
  await db.conversation.deleteMany({ where: { userId } });
  await db.shoppingList.deleteMany({ where: { userId } });
  await logout();
}

/** Ensure the Kitchen Friend admin account exists. Optionally reset password. */
export async function ensureAdminUser(options?: { password?: string; resetPassword?: boolean }) {
  const email = ADMIN_EMAIL;
  const password = options?.password || getAdminPassword();
  const resetPassword = options?.resetPassword ?? false;
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: {
        ...(resetPassword ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
        role: "admin",
        name: existing.name || "Lonnie",
        deletedAt: null,
      },
    });
    return existing.id;
  }
  const user = await db.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      name: "Lonnie",
      role: "admin",
      guestToken: nanoid(),
      profile: { create: {} },
    },
  });
  return user.id;
}
