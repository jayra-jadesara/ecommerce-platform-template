import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import {
  quotaLevel,
  SUPABASE_FREE,
  type QuotaLevel,
} from "@/features/platform-usage/plan-limits";

const VIDEO_BUCKETS = new Set<string>([STORAGE_BUCKETS.reels]);

const IMAGE_BUCKETS = new Set<string>([
  STORAGE_BUCKETS.branding,
  STORAGE_BUCKETS.products,
  STORAGE_BUCKETS.categories,
  STORAGE_BUCKETS.cms,
  STORAGE_BUCKETS.media,
  STORAGE_BUCKETS.replacements,
]);

const BUCKET_LABELS: Record<string, string> = {
  [STORAGE_BUCKETS.branding]: "Branding",
  [STORAGE_BUCKETS.products]: "Products",
  [STORAGE_BUCKETS.categories]: "Categories",
  [STORAGE_BUCKETS.cms]: "CMS",
  [STORAGE_BUCKETS.media]: "Media library",
  [STORAGE_BUCKETS.replacements]: "Replacements",
  [STORAGE_BUCKETS.reels]: "Reels (video)",
};

export type StorageBucketUsage = {
  bucketId: string;
  label: string;
  bytes: number;
  kind: "image" | "video" | "other";
};

export type SupabaseUsageSnapshot = {
  ok: true;
  planLabel: string;
  databaseBytes: number;
  databaseLimitBytes: number;
  databaseLevel: QuotaLevel;
  imageBytes: number;
  videoBytes: number;
  otherBytes: number;
  fileBytes: number;
  fileLimitBytes: number;
  fileLevel: QuotaLevel;
  imageLevel: QuotaLevel;
  videoLevel: QuotaLevel;
  buckets: StorageBucketUsage[];
  egressUncachedLimitBytes: number;
  egressCachedLimitBytes: number;
  tips: string[];
};

export type SupabaseUsageResult =
  | SupabaseUsageSnapshot
  | { ok: false; error: string };

function bucketKind(bucketId: string): "image" | "video" | "other" {
  if (VIDEO_BUCKETS.has(bucketId)) return "video";
  if (IMAGE_BUCKETS.has(bucketId)) return "image";
  return "other";
}

/**
 * Live Supabase Free usage via service-role RPCs.
 */
export async function getSupabaseUsageSnapshot(): Promise<SupabaseUsageResult> {
  try {
    const supabase = createSupabaseServiceClient();

    const [dbResult, storageResult] = await Promise.all([
      supabase.rpc("admin_platform_database_size_bytes" as never),
      supabase.rpc("admin_platform_storage_by_bucket" as never),
    ]);

    if (dbResult.error) {
      return {
        ok: false,
        error:
          dbResult.error.message ||
          "Could not read database size. Apply the latest migration and retry.",
      };
    }
    if (storageResult.error) {
      return {
        ok: false,
        error:
          storageResult.error.message ||
          "Could not read file storage sizes. Apply the latest migration and retry.",
      };
    }

    const databaseBytes = Number(dbResult.data) || 0;
    const rows = (storageResult.data ?? []) as Array<{
      bucket_id?: string;
      total_bytes?: number | string;
    }>;

    const buckets: StorageBucketUsage[] = rows
      .map((row) => {
        const bucketId = String(row.bucket_id ?? "").trim();
        const bytes = Number(row.total_bytes) || 0;
        return {
          bucketId,
          label: BUCKET_LABELS[bucketId] ?? bucketId,
          bytes,
          kind: bucketKind(bucketId),
        };
      })
      .filter((b) => b.bucketId)
      .sort((a, b) => b.bytes - a.bytes);

    let imageBytes = 0;
    let videoBytes = 0;
    let otherBytes = 0;
    for (const b of buckets) {
      if (b.kind === "image") imageBytes += b.bytes;
      else if (b.kind === "video") videoBytes += b.bytes;
      else otherBytes += b.bytes;
    }
    const fileBytes = imageBytes + videoBytes + otherBytes;
    const fileLimit = SUPABASE_FREE.fileStorageBytes;
    const dbLimit = SUPABASE_FREE.databaseBytes;

    return {
      ok: true,
      planLabel: SUPABASE_FREE.planLabel,
      databaseBytes,
      databaseLimitBytes: dbLimit,
      databaseLevel: quotaLevel(databaseBytes, dbLimit),
      imageBytes,
      videoBytes,
      otherBytes,
      fileBytes,
      fileLimitBytes: fileLimit,
      fileLevel: quotaLevel(fileBytes, fileLimit),
      imageLevel: quotaLevel(imageBytes, fileLimit),
      videoLevel: quotaLevel(videoBytes, fileLimit),
      buckets,
      egressUncachedLimitBytes: SUPABASE_FREE.egressUncachedBytes,
      egressCachedLimitBytes: SUPABASE_FREE.egressCachedBytes,
      tips: [
        "Free projects pause after about 1 week with no activity.",
        "If the database goes past 500 MB, writes can stop (read-only).",
        "File storage free allowance is 1 GB for images + videos combined.",
        "Monthly data transfer (egress) is 5 GB uncached + 5 GB cached — check Supabase → Organization → Usage.",
        "You can have up to 2 active free projects. Upgrade to Pro when storage or traffic grows.",
      ],
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load Supabase usage.",
    };
  }
}
