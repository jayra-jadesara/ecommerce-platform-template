/**
 * Best-effort in-process rate limiter.
 * Suitable for single-node / warm serverless instances — not a distributed guarantee.
 * Documented limitation: multi-instance deployments need edge/WAF rate limits.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 5_000;

function pruneIfNeeded(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_KEYS) {
    // Drop oldest half of keys as a safety valve
    let i = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      i += 1;
      if (i >= Math.floor(MAX_KEYS / 2)) break;
    }
  }
}

export function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  const now = input.now ?? Date.now();
  const limit = Math.max(1, Math.floor(input.limit));
  const windowMs = Math.max(1_000, Math.floor(input.windowMs));
  pruneIfNeeded(now);

  const existing = buckets.get(input.key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterMs: 0,
  };
}

/** Test helper — clears all buckets. */
export function resetRateLimitBuckets(): void {
  buckets.clear();
}

export const RATE_LIMITS = {
  auth: { limit: 20, windowMs: 15 * 60_000 },
  newsletter: { limit: 8, windowMs: 60 * 60_000 },
  contact: { limit: 8, windowMs: 60 * 60_000 },
  coupon: { limit: 30, windowMs: 15 * 60_000 },
  checkout: { limit: 15, windowMs: 15 * 60_000 },
  webhook: { limit: 120, windowMs: 60_000 },
} as const;
