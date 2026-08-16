import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const COOKIE = "kf_session";

function secret() {
  return new TextEncoder().encode(env().AUTH_SECRET || "dev-only-change-me-kitchen-friend");
}

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  guest: boolean;
};

async function sign(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function readSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = await db.user.findUnique({ where: { id: String(payload.sub) } });
    if (!user || user.deletedAt) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      guest: !user.email,
    };
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
      profile: { create: {} },
    },
  });
  const jwt = await sign(user.id);
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { id: user.id, email: user.email, name: user.name, guest: true };
}

export async function register(email: string, password: string, name?: string) {
  const current = await requireUser();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.update({
    where: { id: current.id },
    data: { email: email.toLowerCase(), passwordHash, name: name || current.name },
  });
  const jwt = await sign(user.id);
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return user;
}

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user?.passwordHash) throw new Error("That email isn't on a saved kitchen yet.");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error("That password doesn't match.");
  const jwt = await sign(user.id);
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return user;
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

export async function deleteAccount(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), email: null, passwordHash: null, name: "Deleted" },
  });
  await db.kitchenItem.deleteMany({ where: { userId } });
  await db.kitchenScan.deleteMany({ where: { userId } });
  await db.conversation.deleteMany({ where: { userId } });
  await db.shoppingList.deleteMany({ where: { userId } });
  await logout();
}
