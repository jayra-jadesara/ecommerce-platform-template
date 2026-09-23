import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const IMPERSONATE_COOKIE = "wl_admin_impersonate";
const IMPERSONATE_TTL_SEC = 2 * 60 * 60;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ImpersonationPayload = {
  actorUserId: string;
  targetUserId: string;
  exp: number;
};

function impersonationSecret(): string {
  const dedicated = process.env.GUEST_CART_SECRET?.trim() || "";
  if (dedicated) return dedicated;
  if (process.env.NODE_ENV === "production") return "";
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Super Admin overlay: keep real Auth session, switch effective admin RBAC.
 */
export async function setImpersonationCookie(input: {
  actorUserId: string;
  targetUserId: string;
}): Promise<void> {
  const secret = impersonationSecret();
  if (
    !secret ||
    !UUID_RE.test(input.actorUserId) ||
    !UUID_RE.test(input.targetUserId)
  ) {
    throw new Error("Unable to start staff view session.");
  }
  const exp = Math.floor(Date.now() / 1000) + IMPERSONATE_TTL_SEC;
  const payload = `${input.actorUserId}.${input.targetUserId}.${exp}`;
  const value = `${payload}.${signPayload(payload, secret)}`;
  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: IMPERSONATE_TTL_SEC,
  });
}

export async function readImpersonationCookie(): Promise<ImpersonationPayload | null> {
  const secret = impersonationSecret();
  if (!secret) return null;
  const jar = await cookies();
  const raw = jar.get(IMPERSONATE_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [actorUserId, targetUserId, expStr, signature] = parts;
  if (!actorUserId || !targetUserId || !expStr || !signature) return null;
  if (!UUID_RE.test(actorUserId) || !UUID_RE.test(targetUserId)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const payload = `${actorUserId}.${targetUserId}.${expStr}`;
  if (!safeEqual(signature, signPayload(payload, secret))) return null;
  return { actorUserId, targetUserId, exp };
}

export async function clearImpersonationCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
