import { type StorageBucket } from "@/lib/supabase/storage";

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

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return undefined;

  return `${base}/storage/v1/object/public/${bucket}/${normalized}`;
}
