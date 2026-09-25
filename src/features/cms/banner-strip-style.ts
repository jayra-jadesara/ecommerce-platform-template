/** Shared coupon-strip styling helpers (admin preview + storefront). */

import { BANNER_DEFAULT_BACKGROUND } from "@/features/cms/schemas";

function resolveHex(hex: string | null | undefined): string {
  const raw = String(hex ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return BANNER_DEFAULT_BACKGROUND;
}

export function bannerStripTextColor(
  hex: string | null | undefined,
): "#FFFFFF" | "#111111" {
  const normalized = resolveHex(hex);
  const raw = normalized.replace("#", "");
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return "#FFFFFF";
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#111111" : "#FFFFFF";
}

function mixTowardWhite(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, "0");
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `#${mix(r)}${mix(g)}${mix(b)}`.toUpperCase();
}

export function bannerStripBackground(hex: string | null | undefined): string {
  const base = resolveHex(hex);
  const mid = mixTowardWhite(base, 0.28);
  return `linear-gradient(90deg, ${base} 0%, ${mid} 48%, ${base} 100%)`;
}

/** Solid fill for split ticket halves (keeps seam color continuous). */
export function bannerStripSolid(hex: string | null | undefined): string {
  return resolveHex(hex);
}

export function productPathFromSlug(slug: string): string {
  return `/products/${slug.replace(/^\/+/, "")}`;
}

export function productSlugFromPath(path: string | null | undefined): string | null {
  const raw = String(path ?? "").trim();
  const match = raw.match(/^\/products\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
