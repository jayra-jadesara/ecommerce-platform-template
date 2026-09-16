import { resolveStoragePathUrl } from "@/lib/supabase/storage-url";
import type { SectionCommonSettings } from "@/features/cms/schemas";

export function sectionShellClassName(
  settings: Pick<
    SectionCommonSettings,
    "backgroundStyle" | "spacingPreset"
  >,
): string {
  const bg: Record<SectionCommonSettings["backgroundStyle"], string> = {
    default: "bg-transparent",
    surface: "bg-[var(--color-surface)]",
    "primary-soft":
      "bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-background))]",
    "accent-soft":
      "bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--color-background))]",
    dark: "bg-[var(--color-foreground)] text-[var(--color-background)]",
  };

  const space: Record<SectionCommonSettings["spacingPreset"], string> = {
    compact: "py-8 md:py-10",
    normal: "py-10 md:py-14",
    spacious: "py-12 md:py-16",
  };

  return [
    "w-full",
    bg[settings.backgroundStyle] ?? bg.default,
    space[settings.spacingPreset] ?? space.normal,
  ].join(" ");
}

/** Public URL for a CMS / media library path (or absolute URL). */
export function resolveCmsImageUrl(
  path: string | null | undefined,
): string | null {
  return resolveStoragePathUrl(path) ?? null;
}
