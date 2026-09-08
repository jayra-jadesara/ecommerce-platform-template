/**
 * Pure builders for PWA manifest tests — mirrors app/manifest.ts rules.
 */
export function buildManifestFields(input: {
  brandName?: string | null;
  siteName?: string | null;
  description?: string | null;
  tagline?: string | null;
  primaryColor?: string | null;
  backgroundColor?: string | null;
  iconUrl?: string | null;
  locale?: string | null;
}) {
  const name =
    input.brandName?.trim() || input.siteName?.trim() || "Store";
  const shortName = name.length > 12 ? `${name.slice(0, 11)}…` : name;
  return {
    name,
    short_name: shortName,
    description:
      input.description?.trim() ||
      input.tagline?.trim() ||
      "Shop online",
    start_url: "/",
    display: "standalone" as const,
    theme_color: input.primaryColor || input.backgroundColor || "#ffffff",
    background_color: input.backgroundColor || "#ffffff",
    lang: input.locale?.split("-")[0] || "en",
    iconSrc: input.iconUrl || "/icon.svg",
  };
}
