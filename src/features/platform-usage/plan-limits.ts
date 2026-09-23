/** Shared formatters + quota helpers (Vercel meters still use plan caps). */

export const BYTES_PER_MB = 1024 * 1024;
export const BYTES_PER_GB = 1024 * BYTES_PER_MB;

/**
 * Default included capacity for Hosting charts (Space left meter).
 * Override with SUPABASE_DATABASE_LIMIT_BYTES / SUPABASE_FILE_LIMIT_BYTES —
 * no plan name shown in the UI.
 * @see https://supabase.com/pricing
 */
export const SUPABASE_INCLUDED_CAPACITY = {
  databaseBytes: 500 * BYTES_PER_MB,
  fileStorageBytes: 1 * BYTES_PER_GB,
} as const;

/** Vercel Hobby — https://vercel.com/docs/plans/hobby */
export const VERCEL_HOBBY = {
  planLabel: "Hobby",
  fastDataTransferBytes: 100 * BYTES_PER_GB,
  fastOriginTransferBytes: 10 * BYTES_PER_GB,
  edgeRequests: 1_000_000,
  functionInvocations: 1_000_000,
  webAnalyticsEvents: 50_000,
} as const;

export type QuotaLevel = "ok" | "warn" | "critical" | "over";

export function quotaPercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(999, (used / limit) * 100);
}

export function quotaLevel(used: number, limit: number): QuotaLevel {
  const pct = quotaPercent(used, limit);
  if (pct >= 100) return "over";
  if (pct >= 90) return "critical";
  if (pct >= 70) return "warn";
  return "ok";
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < BYTES_PER_MB) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < BYTES_PER_GB) return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
  return `${(bytes / BYTES_PER_GB).toFixed(2)} GB`;
}

export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function quotaStatusLabel(level: QuotaLevel): string {
  switch (level) {
    case "ok":
      return "Looks fine";
    case "warn":
      return "Getting full";
    case "critical":
      return "Near the limit";
    case "over":
      return "Over the plan limit";
  }
}
