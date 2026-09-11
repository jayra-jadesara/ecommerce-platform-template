import type {
  BlogCardStyle,
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
  // SIDEBAR and RIGHT (and unknown) → RIGHT
  return "RIGHT";
}

export function normalizeCardStyle(
  raw: BlogCardStyle | string | null | undefined,
): BlogCardStyle {
  if (raw === "MINIMAL" || raw === "EDITORIAL") return raw;
  return "STANDARD";
}

export function isListLayout(settings: Pick<BlogSettings, "layoutPreset">): boolean {
  return settings.layoutPreset === "LIST";
}

/** Featured block on /blog when enabled and content exists. */
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
