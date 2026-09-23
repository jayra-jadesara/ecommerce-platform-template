import { z } from "zod";
import { optionalSafeUrlSchema } from "@/features/cms/schemas";

/** Admin dropdown options for product CTA on reels (global setting). */
export const REEL_PRODUCT_CTA_OPTIONS = [
  "Shop",
  "Buy now",
  "View",
  "View product",
  "Explore",
  "Add to bag",
] as const;

export type ReelProductCtaLabel = (typeof REEL_PRODUCT_CTA_OPTIONS)[number];

export const reelProductCtaLabelSchema = z.enum(REEL_PRODUCT_CTA_OPTIONS);

export function reelProductCtaOptions(): Array<{
  value: string;
  label: string;
}> {
  return REEL_PRODUCT_CTA_OPTIONS.map((label) => ({
    value: label,
    label,
  }));
}

/** How many reels to load into the storefront showcase (home). */
export const REEL_SHOWCASE_LIMIT_MIN = 1;
export const REEL_SHOWCASE_LIMIT_MAX = 24;
export const REEL_SHOWCASE_LIMIT_DEFAULT = 12;

export const REEL_SHOWCASE_LIMIT_OPTIONS = [
  3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 24,
] as const;

export const reelShowcaseLimitSchema = z
  .number()
  .int()
  .min(REEL_SHOWCASE_LIMIT_MIN)
  .max(REEL_SHOWCASE_LIMIT_MAX);

export function clampReelShowcaseLimit(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return REEL_SHOWCASE_LIMIT_DEFAULT;
  return Math.min(
    REEL_SHOWCASE_LIMIT_MAX,
    Math.max(REEL_SHOWCASE_LIMIT_MIN, Math.round(n)),
  );
}

export function reelShowcaseLimitOptions(): Array<{
  value: string;
  label: string;
}> {
  return REEL_SHOWCASE_LIMIT_OPTIONS.map((n) => ({
    value: String(n),
    label: `${n} reels`,
  }));
}

/** How many reels peek in the carousel at once (home + product). */
export const REEL_VISIBLE_SLIDES_MIN = 1;
export const REEL_VISIBLE_SLIDES_MAX = 5;
export const REEL_VISIBLE_SLIDES_DEFAULT = 3;

export const REEL_VISIBLE_SLIDES_OPTIONS = [1, 2, 3, 4, 5] as const;

export const reelVisibleSlidesSchema = z
  .number()
  .int()
  .min(REEL_VISIBLE_SLIDES_MIN)
  .max(REEL_VISIBLE_SLIDES_MAX);

export function clampReelVisibleSlides(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return REEL_VISIBLE_SLIDES_DEFAULT;
  return Math.min(
    REEL_VISIBLE_SLIDES_MAX,
    Math.max(REEL_VISIBLE_SLIDES_MIN, Math.round(n)),
  );
}

export function reelVisibleSlidesOptions(): Array<{
  value: string;
  label: string;
}> {
  return REEL_VISIBLE_SLIDES_OPTIONS.map((n) => ({
    value: String(n),
    label: String(n),
  }));
}

export const REEL_PRODUCT_PAGE_HEADING_DEFAULT = "Seen in reels";
export const REEL_PRODUCT_PAGE_HEADING_MAX = 80;

export const reelProductPageHeadingSchema = z
  .string()
  .trim()
  .min(1, "Heading is required.")
  .max(REEL_PRODUCT_PAGE_HEADING_MAX, "Heading is too long.");

export function normalizeReelProductPageHeading(value: unknown): string {
  if (typeof value !== "string") return REEL_PRODUCT_PAGE_HEADING_DEFAULT;
  const trimmed = value.trim();
  if (!trimmed) return REEL_PRODUCT_PAGE_HEADING_DEFAULT;
  return trimmed.slice(0, REEL_PRODUCT_PAGE_HEADING_MAX);
}

/** Content fields — visibility / sort / global CTA live on the grid / settings. */
export const reelFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title is too long."),
  instagramUrl: optionalSafeUrlSchema.optional().default(null),
  videoPath: z
    .string()
    .trim()
    .min(1, "Upload an MP4 video.")
    .max(500),
  productIds: z.array(z.string().uuid()).max(12).default([]),
});

export type ReelFormValues = z.infer<typeof reelFormSchema>;

export const reelGridPatchSchema = z.object({
  isActive: z.boolean().optional(),
  showOnHome: z.boolean().optional(),
  showOnProductPage: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export type ReelGridPatch = z.infer<typeof reelGridPatchSchema>;

/** Canonical Instagram permalink for attribution (optional). */
export function toInstagramPermalink(
  url: string | null | undefined,
): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "instagram.com" && host !== "instagr.am") {
      return url.trim();
    }
    let path = parsed.pathname
      .replace(/\/+$/, "")
      .replace(/\/embed(\/captioned)?$/i, "");
    path = path.replace(/\/reels\//i, "/reel/");
    if (!path) return url.trim();
    return `https://www.instagram.com${path}/`;
  } catch {
    return null;
  }
}
