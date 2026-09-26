import "server-only";

import { cookies } from "next/headers";
import {
  SESSION_STARTED_COOKIE,
  SESSION_STARTED_COOKIE_MAX_AGE_SEC,
} from "@/features/auth/proxy-auth-headers";

/** Mark the start of the current browser login (call after successful sign-in). */
export async function markSessionStarted(): Promise<void> {
  const jar = await cookies();
  const nowSec = Math.floor(Date.now() / 1000);
  jar.set(SESSION_STARTED_COOKIE, String(nowSec), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_STARTED_COOKIE_MAX_AGE_SEC,
  });
}

export async function clearSessionStarted(): Promise<void> {
  try {
    const jar = await cookies();
    jar.delete(SESSION_STARTED_COOKIE);
  } catch {
    // RSC / read-only cookie store — ignore; route handlers clear explicitly.
  }
}

export async function readSessionStartedAtSec(): Promise<number | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_STARTED_COOKIE)?.value;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
