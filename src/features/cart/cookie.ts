import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
  buildGuestCartCookieValue,
  parseGuestCartCookieValue,
} from "@/features/cart/guest-token";
import {
  GUEST_CART_COOKIE,
  GUEST_CART_TTL_DAYS_DEFAULT,
} from "@/features/cart/types";

/**
 * Prefer dedicated GUEST_CART_SECRET.
 * Production requires it (no service-role fallback) so rotating DB keys
 * does not invalidate carts and the HMAC key stays purpose-scoped.
 * Development may fall back to the service role key for local ergonomics.
 */
export function guestCartSecret(): string {
  const dedicated = process.env.GUEST_CART_SECRET?.trim() || "";
  if (dedicated) return dedicated;

  if (process.env.NODE_ENV === "production") {
    return "";
  }

  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

function guestCartTtlDays(): number {
  const raw = Number(process.env.GUEST_CART_TTL_DAYS || GUEST_CART_TTL_DAYS_DEFAULT);
  if (!Number.isFinite(raw)) return GUEST_CART_TTL_DAYS_DEFAULT;
  return Math.max(1, Math.min(365, Math.floor(raw)));
}

export async function readGuestCartToken(): Promise<string | null> {
  const jar = await cookies();
  return parseGuestCartCookieValue(jar.get(GUEST_CART_COOKIE)?.value, guestCartSecret());
}

export async function ensureGuestCartToken(): Promise<string> {
  const existing = await readGuestCartToken();
  if (existing) return existing;

  const token = randomUUID();
  const jar = await cookies();
  const maxAge = guestCartTtlDays() * 24 * 60 * 60;
  jar.set(GUEST_CART_COOKIE, buildGuestCartCookieValue(token, guestCartSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return token;
}

export async function clearGuestCartCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(GUEST_CART_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export { guestCartTtlDays };
