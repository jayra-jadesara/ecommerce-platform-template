/**
 * Configurable upload size limits (MB → bytes).
 * Admin images: 1–10 MB (default 5). Replace photos: 1–4 MB (default 1).
 * Admin reel video: 2–50 MB (default 25).
 */

export const ADMIN_IMAGE_MAX_MB_DEFAULT = 5;
export const ADMIN_IMAGE_MAX_MB_MIN = 1;
export const ADMIN_IMAGE_MAX_MB_MAX = 10;

export const REPLACE_PHOTO_MAX_MB_DEFAULT = 1;
export const REPLACE_PHOTO_MAX_MB_MIN = 1;
export const REPLACE_PHOTO_MAX_MB_MAX = 4;

export const ADMIN_REEL_VIDEO_MAX_MB_DEFAULT = 25;
export const ADMIN_REEL_VIDEO_MAX_MB_MIN = 2;
export const ADMIN_REEL_VIDEO_MAX_MB_MAX = 50;

/** Target reel aspect ~9:16 (width/height). Allow slight camera variance. */
export const REEL_ASPECT_RATIO_TARGET = 9 / 16;
export const REEL_ASPECT_RATIO_MIN = REEL_ASPECT_RATIO_TARGET - 0.08;
export const REEL_ASPECT_RATIO_MAX = REEL_ASPECT_RATIO_TARGET + 0.08;

/** @deprecated Prefer getAdminImageMaxBytes() — kept as fallback default. */
export const MAX_MEDIA_IMAGE_BYTES =
  ADMIN_IMAGE_MAX_MB_DEFAULT * 1024 * 1024;

export function mbToBytes(mb: number): number {
  return Math.round(mb) * 1024 * 1024;
}

export function coerceAdminImageMaxMb(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return ADMIN_IMAGE_MAX_MB_DEFAULT;
  return Math.min(
    ADMIN_IMAGE_MAX_MB_MAX,
    Math.max(ADMIN_IMAGE_MAX_MB_MIN, Math.round(n)),
  );
}

export function coerceReplacePhotoMaxMb(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return REPLACE_PHOTO_MAX_MB_DEFAULT;
  return Math.min(
    REPLACE_PHOTO_MAX_MB_MAX,
    Math.max(REPLACE_PHOTO_MAX_MB_MIN, Math.round(n)),
  );
}

export function coerceAdminReelVideoMaxMb(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return ADMIN_REEL_VIDEO_MAX_MB_DEFAULT;
  return Math.min(
    ADMIN_REEL_VIDEO_MAX_MB_MAX,
    Math.max(ADMIN_REEL_VIDEO_MAX_MB_MIN, Math.round(n)),
  );
}

/** Portrait reel ~9:16. Reject landscape / square / extreme tall crops. */
export function isValidReelAspectRatio(
  width: number,
  height: number,
): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width <= 0 || height <= 0) return false;
  if (height <= width) return false;
  const ratio = width / height;
  return ratio >= REEL_ASPECT_RATIO_MIN && ratio <= REEL_ASPECT_RATIO_MAX;
}

export function adminImageMaxMbOptions(): Array<{ value: string; label: string }> {
  return Array.from(
    { length: ADMIN_IMAGE_MAX_MB_MAX - ADMIN_IMAGE_MAX_MB_MIN + 1 },
    (_, i) => {
      const mb = ADMIN_IMAGE_MAX_MB_MIN + i;
      return {
        value: String(mb),
        label: mb === 1 ? "1 MB" : `${mb} MB`,
      };
    },
  );
}

export function replacePhotoMaxMbOptions(): Array<{
  value: string;
  label: string;
}> {
  return Array.from(
    { length: REPLACE_PHOTO_MAX_MB_MAX - REPLACE_PHOTO_MAX_MB_MIN + 1 },
    (_, i) => {
      const mb = REPLACE_PHOTO_MAX_MB_MIN + i;
      return {
        value: String(mb),
        label: mb === 1 ? "1 MB" : `${mb} MB`,
      };
    },
  );
}

export function adminReelVideoMaxMbOptions(): Array<{
  value: string;
  label: string;
}> {
  return Array.from(
    {
      length:
        ADMIN_REEL_VIDEO_MAX_MB_MAX - ADMIN_REEL_VIDEO_MAX_MB_MIN + 1,
    },
    (_, i) => {
      const mb = ADMIN_REEL_VIDEO_MAX_MB_MIN + i;
      return {
        value: String(mb),
        label: `${mb} MB`,
      };
    },
  );
}

export function formatMaxMbHint(mb: number): string {
  return `JPEG, PNG, or WebP · max ${mb} MB`;
}

export function formatReplacePhotoHint(mb: number): string {
  return `JPEG/PNG/WEBP, max ${mb} MB`;
}

export function formatReelVideoMaxMbHint(mb: number): string {
  return `MP4 or WebM · vertical ~9:16 · max ${mb} MB`;
}
