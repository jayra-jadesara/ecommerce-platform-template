import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import { ADMIN_CHART_COLORS } from "@/features/admin/ui/charts/tokens";
import {
  formatBytes,
  SUPABASE_INCLUDED_CAPACITY,
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

export type DatabaseRelationUsage = {
  name: string;
  bytes: number;
};

export type UsageSegment = {
  name: string;
  bytes: number;
  color: string;
};

export type SupabaseUsageSnapshot = {
  ok: true;
  databaseBytes: number;
  imageBytes: number;
  videoBytes: number;
  otherBytes: number;
  fileBytes: number;
  /** Database + all file bytes (live measured). */
  totalBytes: number;
  databaseLimitBytes: number;
  fileLimitBytes: number;
  /** Combined capacity for Overall meter. */
  totalLimitBytes: number;
  databaseRemainingBytes: number;
  fileRemainingBytes: number;
  totalRemainingBytes: number;
  /** Overview donut: Database / Images / Videos / Other (+ Space left via capacity). */
  overviewSegments: UsageSegment[];
  /** File storage donut: Images / Videos / Other. */
  fileSegments: UsageSegment[];
  /** Largest DB relations (+ other used). */
  databaseSegments: UsageSegment[];
  databaseRelations: DatabaseRelationUsage[];
  buckets: StorageBucketUsage[];
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

function friendlyRelationName(qualified: string): string {
  const raw = qualified.trim();
  const dot = raw.lastIndexOf(".");
  const name = dot >= 0 ? raw.slice(dot + 1) : raw;
  return name.replace(/_/g, " ");
}

function envBytes(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function resolveCapacityLimits() {
  const databaseLimitBytes = envBytes(
    "SUPABASE_DATABASE_LIMIT_BYTES",
    SUPABASE_INCLUDED_CAPACITY.databaseBytes,
  );
  const fileLimitBytes = envBytes(
    "SUPABASE_FILE_LIMIT_BYTES",
    SUPABASE_INCLUDED_CAPACITY.fileStorageBytes,
  );
  return {
    databaseLimitBytes,
    fileLimitBytes,
    totalLimitBytes: databaseLimitBytes + fileLimitBytes,
  };
}

/**
 * Live project usage via service role RPCs.
 * Capacity drives “Space left” on charts (env override or included allowance).
 */
export async function getSupabaseUsageSnapshot(): Promise<SupabaseUsageResult> {
  try {
    const projectUsage = await measureProjectStorage();
    if (!projectUsage.ok) return projectUsage;

    const {
      databaseBytes,
      imageBytes,
      videoBytes,
      otherBytes,
      fileBytes,
      buckets,
      databaseRelations,
    } = projectUsage;

    const { databaseLimitBytes, fileLimitBytes, totalLimitBytes } =
      resolveCapacityLimits();

    const totalBytes = databaseBytes + fileBytes;
    const databaseRemainingBytes = Math.max(
      0,
      databaseLimitBytes - databaseBytes,
    );
    const fileRemainingBytes = Math.max(0, fileLimitBytes - fileBytes);
    const totalRemainingBytes = Math.max(0, totalLimitBytes - totalBytes);

    const overviewSegments: UsageSegment[] = [
      {
        name: "Database",
        bytes: databaseBytes,
        color: ADMIN_CHART_COLORS.primary,
      },
      {
        name: "Images",
        bytes: imageBytes,
        color: ADMIN_CHART_COLORS.success,
      },
      {
        name: "Videos",
        bytes: videoBytes,
        color: ADMIN_CHART_COLORS.accent,
      },
      {
        name: "Other files",
        bytes: otherBytes,
        color: ADMIN_CHART_COLORS.secondary,
      },
    ].filter((s) => s.bytes > 0);

    const fileSegments: UsageSegment[] = [
      {
        name: "Images",
        bytes: imageBytes,
        color: ADMIN_CHART_COLORS.success,
      },
      {
        name: "Videos",
        bytes: videoBytes,
        color: ADMIN_CHART_COLORS.accent,
      },
      {
        name: "Other",
        bytes: otherBytes,
        color: ADMIN_CHART_COLORS.secondary,
      },
    ].filter((s) => s.bytes > 0);

    // Keep DB ring readable: top relations + rolled-up remainder (Space left via capacity).
    const topRelations = databaseRelations.slice(0, 4);
    const topSum = topRelations.reduce((sum, r) => sum + r.bytes, 0);
    const remainder = Math.max(0, databaseBytes - topSum);
    const databaseSegments: UsageSegment[] = [
      ...topRelations.map((r, i) => ({
        name: friendlyRelationName(r.name),
        bytes: r.bytes,
        color: [
          ADMIN_CHART_COLORS.primary,
          ADMIN_CHART_COLORS.success,
          ADMIN_CHART_COLORS.accent,
          ADMIN_CHART_COLORS.secondary,
        ][i % 4]!,
      })),
      ...(remainder > 0
        ? [
            {
              name: "Other tables",
              bytes: remainder,
              color: ADMIN_CHART_COLORS.warning,
            },
          ]
        : []),
    ].filter((s) => s.bytes > 0);

    return {
      ok: true,
      databaseBytes,
      imageBytes,
      videoBytes,
      otherBytes,
      fileBytes,
      totalBytes,
      databaseLimitBytes,
      fileLimitBytes,
      totalLimitBytes,
      databaseRemainingBytes,
      fileRemainingBytes,
      totalRemainingBytes,
      overviewSegments,
      fileSegments,
      databaseSegments,
      databaseRelations,
      buckets,
      tips: buildTips({
        databaseBytes,
        fileBytes,
        imageBytes,
        videoBytes,
        databaseRemainingBytes,
        fileRemainingBytes,
        databaseLimitBytes,
        fileLimitBytes,
      }),
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

async function measureProjectStorage(): Promise<
  | {
      ok: true;
      databaseBytes: number;
      imageBytes: number;
      videoBytes: number;
      otherBytes: number;
      fileBytes: number;
      buckets: StorageBucketUsage[];
      databaseRelations: DatabaseRelationUsage[];
    }
  | { ok: false; error: string }
> {
  const supabase = createSupabaseServiceClient();

  const [dbResult, storageResult, relationsResult] = await Promise.all([
    supabase.rpc("admin_platform_database_size_bytes" as never),
    supabase.rpc("admin_platform_storage_by_bucket" as never),
    supabase.rpc("admin_platform_database_relation_sizes" as never, {
      p_limit: 8,
    } as never),
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

  let databaseRelations: DatabaseRelationUsage[] = [];
  if (!relationsResult.error && Array.isArray(relationsResult.data)) {
    databaseRelations = (relationsResult.data as Array<{
      relation_name?: string;
      total_bytes?: number | string;
    }>)
      .map((row) => ({
        name: String(row.relation_name ?? "").trim(),
        bytes: Number(row.total_bytes) || 0,
      }))
      .filter((r) => r.name && r.bytes > 0);
  } else if (databaseBytes > 0) {
    // Migration not applied yet — still show a single live DB segment.
    databaseRelations = [{ name: "database", bytes: databaseBytes }];
  }

  return {
    ok: true,
    databaseBytes,
    imageBytes,
    videoBytes,
    otherBytes,
    fileBytes: imageBytes + videoBytes + otherBytes,
    buckets,
    databaseRelations,
  };
}

function buildTips(sizes: {
  databaseBytes: number;
  fileBytes: number;
  imageBytes: number;
  videoBytes: number;
  databaseRemainingBytes: number;
  fileRemainingBytes: number;
  databaseLimitBytes: number;
  fileLimitBytes: number;
}): string[] {
  return [
    `Database ${formatBytes(sizes.databaseBytes)} of ${formatBytes(sizes.databaseLimitBytes)} · ${formatBytes(sizes.databaseRemainingBytes)} space left.`,
    `Files ${formatBytes(sizes.fileBytes)} of ${formatBytes(sizes.fileLimitBytes)} (images ${formatBytes(sizes.imageBytes)} · videos ${formatBytes(sizes.videoBytes)}) · ${formatBytes(sizes.fileRemainingBytes)} space left.`,
    "Capacity defaults to included allowance; set SUPABASE_DATABASE_LIMIT_BYTES / SUPABASE_FILE_LIMIT_BYTES to match your project.",
    "Keep-alive cron pings the database every 2 days via /api/cron/supabase-keepalive (needs CRON_SECRET on Vercel).",
  ];
}

/**
 * Real Postgres activity for keep-alive (called by cron).
 */
export async function pingSupabaseDatabaseKeepAlive(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const supabase = createSupabaseServiceClient();
    const { error, count } = await supabase
      .from("store_settings")
      .select("store_id", { count: "exact", head: true });

    if (error) {
      const rpc = await supabase.rpc(
        "admin_platform_database_size_bytes" as never,
      );
      if (rpc.error) {
        return {
          ok: false,
          message:
            error.message || rpc.error.message || "Keep-alive query failed.",
        };
      }
      return {
        ok: true,
        message: `Keep-alive OK via database size RPC (${Number(rpc.data) || 0} bytes reported).`,
      };
    }

    return {
      ok: true,
      message: `Keep-alive OK — database queried (store_settings count=${count ?? 0}).`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Keep-alive failed.",
    };
  }
}
