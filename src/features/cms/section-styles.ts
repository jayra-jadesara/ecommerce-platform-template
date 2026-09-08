import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
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
    normal: "py-12 md:py-16",
    spacious: "py-16 md:py-24",
  };

  return [
    "w-full",
    bg[settings.backgroundStyle] ?? bg.default,
    space[settings.spacingPreset] ?? space.normal,
  ].join(" ");
}

export function resolveCmsImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return (
    resolvePublicStorageUrl("cms", path) ??
    resolvePublicStorageUrl("media", path) ??
    resolvePublicStorageUrl("products", path) ??
    resolvePublicStorageUrl("categories", path) ??
    null
  );
}
