import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { STAFF_VIEW_HEADER } from "@/features/auth/staff-view-constants";

const IMPERSONATE_COOKIE = "wl_admin_impersonate";
const IMPERSONATE_TTL_SEC = 2 * 60 * 60;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ImpersonationPayload = {
  actorUserId: string;
  targetUserId: string;
  exp: number;
};

export { STAFF_VIEW_HEADER, IMPERSONATE_TTL_SEC };

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
 * Signed staff-view token for URL path `/as/{token}/…`.
 * Tab-scoped: only that tab’s URLs carry the token (no shared cookie).
 */
export function createStaffViewToken(input: {
  actorUserId: string;
  targetUserId: string;
}): string {
  const secret = impersonationSecret();
  if (!secret) {
    throw new Error(
      process.env.NODE_ENV === "production"
        ? "Staff view is not configured. Set GUEST_CART_SECRET."
        : "Staff view needs GUEST_CART_SECRET or SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  if (!UUID_RE.test(input.actorUserId) || !UUID_RE.test(input.targetUserId)) {
    throw new Error("Invalid staff view session.");
  }
  const exp = Math.floor(Date.now() / 1000) + IMPERSONATE_TTL_SEC;
  const payload = `${input.actorUserId}.${input.targetUserId}.${exp}`;
  return `${payload}.${signPayload(payload, secret)}`;
}

export function parseStaffViewToken(raw: string): ImpersonationPayload | null {
  const secret = impersonationSecret();
  if (!secret || !raw) return null;
  const token = decodeURIComponent(raw.trim());
  const parts = token.split(".");
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

/**
 * Prefer URL token header (tab-isolated).
 * Legacy `wl_admin_impersonate` cookie is ignored here — never applied and
 * never cleared during RSC render (cookie writes only in actions / route handlers).
 */
export async function readStaffViewOverlay(): Promise<ImpersonationPayload | null> {
  const headerList = await headers();
  const fromHeader = headerList.get(STAFF_VIEW_HEADER);
  if (!fromHeader) return null;
  return parseStaffViewToken(fromHeader);
}

/** @deprecated Prefer createStaffViewToken + URL path. Kept to clear legacy cookies. */
export async function setImpersonationCookie(input: {
  actorUserId: string;
  targetUserId: string;
}): Promise<void> {
  void input;
  await clearImpersonationCookie();
}

/** @deprecated Use readStaffViewOverlay. */
export async function readImpersonationCookie(): Promise<ImpersonationPayload | null> {
  return readStaffViewOverlay();
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
