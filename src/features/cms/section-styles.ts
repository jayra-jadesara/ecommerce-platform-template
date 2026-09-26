import type { CSSProperties } from "react";
import { resolveStoragePathUrl } from "@/lib/supabase/storage-url";
import type { SectionCommonSettings } from "@/features/cms/schemas";

export type SectionBackgroundStyle = SectionCommonSettings["backgroundStyle"];

/** Soft fills — kept quiet so stacked sections stay premium, not striped. */
export const SECTION_BG_FILL: Record<SectionBackgroundStyle, string> = {
  default: "transparent",
  surface: "var(--color-surface)",
  "primary-soft":
    "color-mix(in srgb, var(--color-primary) 7%, var(--color-background))",
  "accent-soft":
    "color-mix(in srgb, var(--color-accent) 7%, var(--color-background))",
  dark: "var(--color-foreground)",
};

/**
 * Shell classes for CMS sections.
 * Tinted backgrounds use a clean solid fill + light ambient (no edge banding).
 */
export function sectionShellClassName(
  settings: Pick<
    SectionCommonSettings,
    "backgroundStyle" | "spacingPreset"
  >,
): string {
  const bgStyle = settings.backgroundStyle ?? "default";
  const space: Record<SectionCommonSettings["spacingPreset"], string> = {
    compact: "py-8 md:py-10",
    normal: "py-10 md:py-14",
    spacious: "py-12 md:py-16",
  };

  return [
    "sf-section-shell w-full",
    bgStyle !== "default" ? "sf-section-shell--tint" : null,
    bgStyle === "dark" ? "sf-section-shell--dark" : null,
    space[settings.spacingPreset] ?? space.normal,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Fill token for tinted shells. */
export function sectionShellStyle(
  settings: Pick<SectionCommonSettings, "backgroundStyle">,
): CSSProperties | undefined {
  const bgStyle = settings.backgroundStyle ?? "default";
  if (bgStyle === "default") return undefined;
  return {
    ["--sf-section-fill" as string]: SECTION_BG_FILL[bgStyle],
  };
}

/** Public URL for a CMS / media library path (or absolute URL). */
export function resolveCmsImageUrl(
  path: string | null | undefined,
): string | null {
  return resolveStoragePathUrl(path) ?? null;
}
