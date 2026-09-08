import { type StorageBucket } from "@/lib/supabase/storage";
import { normalizeSupabaseUrl } from "@/lib/supabase/env";

/**
 * Build a public object URL for Supabase Storage.
 * Returns undefined when path is empty or public env is missing.
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

export type StorageImageTransform = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
};

/**
 * Optional Supabase Image Transformation URL (hosted Pro feature).
 * Falls back to the plain public object URL when transforms are disabled.
 * Prefer Next.js `<Image>` as the primary optimizer.
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
