import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export {
  hashRecoveryAnswer,
  normalizePhoneForCompare,
  normalizeRecoveryAnswer,
  verifyRecoveryAnswer,
} from "@/features/auth/recovery-crypto";

const RECOVERY_COOKIE = "wl_pwd_recovery";
const RECOVERY_TTL_SEC = 15 * 60;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function recoverySecret(): string {
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

export async function setPasswordRecoveryCookie(userId: string): Promise<void> {
  const secret = recoverySecret();
  if (!secret || !UUID_RE.test(userId)) {
    throw new Error("Unable to start password recovery session.");
  }
  const exp = Math.floor(Date.now() / 1000) + RECOVERY_TTL_SEC;
  const payload = `${userId}.${exp}`;
  const value = `${payload}.${signPayload(payload, secret)}`;
  const jar = await cookies();
  jar.set(RECOVERY_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RECOVERY_TTL_SEC,
  });
}

export async function readPasswordRecoveryUserId(): Promise<string | null> {
  const secret = recoverySecret();
  if (!secret) return null;
  const jar = await cookies();
  const raw = jar.get(RECOVERY_COOKIE)?.value;
  if (!raw) return null;
  const [userId, expStr, signature] = raw.split(".");
  if (!userId || !expStr || !signature) return null;
  if (!UUID_RE.test(userId)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const payload = `${userId}.${expStr}`;
  if (!safeEqual(signature, signPayload(payload, secret))) return null;
  return userId;
}

export async function clearPasswordRecoveryCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(RECOVERY_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
