import type { MetadataRoute } from "next";
import { getPlatformConfigAsync } from "@/config/site.server";

/**
 * Store-aware web app manifest — branding-driven, no hard-coded client names.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getPlatformConfigAsync();
  const name = config.brand.name?.trim() || config.seo.siteName || "Store";
  const shortName =
    name.length > 12 ? `${name.slice(0, 11)}…` : name;
  const themeColor =
    config.theme.light.primary ||
    config.theme.light.background ||
    "#ffffff";
  const backgroundColor = config.theme.light.background || "#ffffff";

  const icons: MetadataRoute.Manifest["icons"] = [];
  const iconUrl = config.brand.faviconUrl || config.brand.logoUrl;
  if (iconUrl) {
    icons.push({
      src: iconUrl,
      sizes: "any",
      type: "image/png",
      purpose: "any",
    });
  }

  return {
    name,
    short_name: shortName,
    description:
      config.seo.description ||
      config.brand.tagline ||
      "Shop online",
    start_url: "/",
    display: "standalone",
    background_color: backgroundColor,
    theme_color: themeColor,
    lang: config.store.locale?.split("-")[0] || "en",
    icons: icons.length
      ? icons
      : [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
  };
}
