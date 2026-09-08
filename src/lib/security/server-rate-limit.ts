import "server-only";

import { headers } from "next/headers";
import {
  checkRateLimit,
  RATE_LIMITS,
  type RateLimitResult,
} from "@/lib/security/rate-limit";

async function clientKey(prefix: string): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = h.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return `${prefix}:${ip}`;
}

export async function enforceRateLimit(
  kind: keyof typeof RATE_LIMITS,
): Promise<RateLimitResult> {
  const cfg = RATE_LIMITS[kind];
  const key = await clientKey(kind);
  return checkRateLimit({ key, limit: cfg.limit, windowMs: cfg.windowMs });
}

export function rateLimitErrorMessage(retryAfterMs: number): string {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return `Too many requests. Try again in about ${seconds}s.`;
}
