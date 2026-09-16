import type {
  BlogCardStyle,
  BlogCoverCtaStyle,
  BlogLayoutPreset,
  BlogSettings,
  BlogSidebarPreset,
} from "@/features/blog/types";

/** Canonical sidebar positions used by the storefront. */
export type BlogSidebarPosition = "RIGHT" | "LEFT" | "TOP" | "NONE";

export function normalizeSidebarPreset(
  raw: BlogSidebarPreset | string | null | undefined,
): BlogSidebarPosition {
  if (raw === "LEFT") return "LEFT";
  if (raw === "TOP" || raw === "TOP_FILTER") return "TOP";
  if (raw === "NONE") return "NONE";
  return "RIGHT";
}

export function normalizeCardStyle(
  raw: BlogCardStyle | string | null | undefined,
): BlogCardStyle {
  if (raw === "MINIMAL" || raw === "EDITORIAL" || raw === "COVER") return raw;
  return "STANDARD";
}

export function normalizeCoverCtaStyle(
  raw: BlogCoverCtaStyle | string | null | undefined,
): BlogCoverCtaStyle {
  if (
    raw === "PLAIN" ||
    raw === "NONE" ||
    raw === "MASALA" ||
    raw === "PACK" ||
    raw === "BAND" ||
    raw === "SQUARE" ||
    raw === "RIBBON" ||
    raw === "STAMP"
  ) {
    return raw;
  }
  return "COOKIE";
}

export function isListLayout(settings: Pick<BlogSettings, "layoutPreset">): boolean {
  return settings.layoutPreset === "LIST";
}

export function wantsFeaturedBlock(
  settings: Pick<BlogSettings, "layoutPreset" | "showFeaturedPost">,
): boolean {
  if (settings.showFeaturedPost === false) return false;
  if (settings.showFeaturedPost === true) return true;
  return settings.layoutPreset === "FEATURED_GRID";
}

export function listingLayoutPreset(
  layout: BlogLayoutPreset,
  showFeatured: boolean,
): BlogLayoutPreset {
  if (layout === "LIST") return "LIST";
  if (showFeatured) return "FEATURED_GRID";
  return "GRID";
}
