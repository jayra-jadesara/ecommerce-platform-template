import {
  STORAGE_BUCKETS,
  type StorageBucket,
} from "@/lib/supabase/storage";
import { normalizeSupabaseUrl } from "@/lib/supabase/env";

const BUCKET_SET = new Set<string>(Object.values(STORAGE_BUCKETS));

/**
 * Infer the storage bucket from a stored object path.
 * Paths are usually `{bucket}/{storeId}/…` inside that same-named bucket.
 */
export function inferStorageBucket(
  path: string | null | undefined,
): StorageBucket | null {
  if (!path?.trim()) return null;
  const normalized = path.trim().replace(/^\/+/, "");
  if (/^https?:\/\//i.test(normalized)) return null;
  const first = normalized.split("/")[0]?.toLowerCase();
  if (first && BUCKET_SET.has(first)) return first as StorageBucket;
  return null;
}

/**
 * Build a public object URL for Supabase Storage.
 * Returns undefined when path is empty or public env is missing.
 *
 * Note: object paths may start with the same segment as the bucket name
 * (e.g. products/{storeId}/… inside the `products` bucket). Do not strip that.
 */
export function resolvePublicStorageUrl(
  bucket: StorageBucket,
  path: string | null | undefined,
): string | undefined {
  if (!path?.trim()) return undefined;

  const normalized = path.trim().replace(/^\/+/, "");
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const base = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!base) return undefined;

  return `${base}/storage/v1/object/public/${bucket}/${normalized}`;
}

/**
 * Resolve a stored path (or absolute URL) to a public object URL.
 * Prefers the bucket implied by the path prefix so callers do not guess wrong
 * (e.g. cms covers must not be requested under the media bucket).
 */
export function resolveStoragePathUrl(
  path: string | null | undefined,
  preferred: StorageBucket[] = [
    "cms",
    "media",
    "products",
    "categories",
    "branding",
  ],
): string | undefined {
  if (!path?.trim()) return undefined;
  const normalized = path.trim().replace(/^\/+/, "");
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const inferred = inferStorageBucket(normalized);
  if (inferred) {
    return resolvePublicStorageUrl(inferred, normalized);
  }

  for (const bucket of preferred) {
    const url = resolvePublicStorageUrl(bucket, normalized);
    if (url) return url;
  }
  return undefined;
}

export type StorageImageTransform = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
};

/**
 * Optional Supabase Image Transformation URL (hosted Pro feature).
 * Falls back to the plain public object URL when transforms are disabled.
 * Next.js uses a custom passthrough image loader (no /_next/image proxy).
 */
export function resolveOptimizedStorageUrl(
  bucket: StorageBucket,
  path: string | null | undefined,
  transform?: StorageImageTransform,
): string | undefined {
  const objectUrl = resolvePublicStorageUrl(bucket, path);
  if (!objectUrl) return undefined;

  const enabled =
    process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM === "1" ||
    process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM === "true";
  if (!enabled || !transform) return objectUrl;

  if (/^https?:\/\//i.test(path?.trim() ?? "")) return objectUrl;

  const base = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!base) return objectUrl;

  const normalized = path!.trim().replace(/^\/+/, "");
  const params = new URLSearchParams();
  if (transform.width && transform.width > 0 && transform.width <= 2500) {
    params.set("width", String(Math.floor(transform.width)));
  }
  if (transform.height && transform.height > 0 && transform.height <= 2500) {
    params.set("height", String(Math.floor(transform.height)));
  }
  if (
    transform.quality &&
    transform.quality >= 20 &&
    transform.quality <= 100
  ) {
    params.set("quality", String(Math.floor(transform.quality)));
  }
  if (transform.resize) params.set("resize", transform.resize);

  if (![...params.keys()].length) return objectUrl;

  return `${base}/storage/v1/render/image/public/${bucket}/${normalized}?${params.toString()}`;
}
