import type { ColorTokens } from "@/types";
import { defaultPlatformConfig } from "@/config/defaults";

/**
 * Minimal DB stub rows for a fresh store (generic white-label defaults).
 * Used by ensureActiveStore — no client-specific branding.
 */

export const DEFAULT_FRESH_STORE_NAME = "My Store";
export const DEFAULT_FRESH_STORE_TAGLINE = "Your store, your brand.";

export type DefaultThemeInsert = {
  store_id: string;
  default_mode: "light" | "dark" | "system";
  enabled_modes: Array<"light" | "dark" | "system">;
  allow_user_toggle: boolean;
  light_primary: string;
  light_secondary: string;
  light_accent: string;
  light_background: string;
  light_foreground: string;
  light_surface: string;
  light_card: string;
  light_border: string;
  light_muted: string;
  light_success: string;
  light_warning: string;
  light_error: string;
  dark_primary: string;
  dark_secondary: string;
  dark_accent: string;
  dark_background: string;
  dark_foreground: string;
  dark_surface: string;
  dark_card: string;
  dark_border: string;
  dark_muted: string;
  dark_success: string;
  dark_warning: string;
  dark_error: string;
  border_radius: string;
};

function mapPalette(tokens: ColorTokens) {
  return {
    primary: tokens.primary,
    secondary: tokens.secondary,
    accent: tokens.accent,
    background: tokens.background,
    foreground: tokens.foreground,
    surface: tokens.surface,
    card: tokens.card,
    border: tokens.border,
    muted: tokens.muted,
    success: tokens.success,
    warning: tokens.warning,
    error: tokens.error,
  };
}

export function buildDefaultThemeInsert(storeId: string): DefaultThemeInsert {
  const light = mapPalette(defaultPlatformConfig.theme.light);
  const dark = mapPalette(defaultPlatformConfig.theme.dark);
  const defaultMode =
    defaultPlatformConfig.theme.defaultMode === "dark"
      ? "dark"
      : defaultPlatformConfig.theme.defaultMode === "system"
        ? "system"
        : "light";

  return {
    store_id: storeId,
    default_mode: defaultMode,
    enabled_modes: ["light", "dark", "system"],
    allow_user_toggle: defaultPlatformConfig.theme.allowUserToggle,
    light_primary: light.primary,
    light_secondary: light.secondary,
    light_accent: light.accent,
    light_background: light.background,
    light_foreground: light.foreground,
    light_surface: light.surface,
    light_card: light.card,
    light_border: light.border,
    light_muted: light.muted,
    light_success: light.success,
    light_warning: light.warning,
    light_error: light.error,
    dark_primary: dark.primary,
    dark_secondary: dark.secondary,
    dark_accent: dark.accent,
    dark_background: dark.background,
    dark_foreground: dark.foreground,
    dark_surface: dark.surface,
    dark_card: dark.card,
    dark_border: dark.border,
    dark_muted: dark.muted,
    dark_success: dark.success,
    dark_warning: dark.warning,
    dark_error: dark.error,
    border_radius: defaultPlatformConfig.theme.borderRadius || "8px",
  };
}

export function buildDefaultSeoInsert(storeId: string, brandName: string) {
  return {
    store_id: storeId,
    site_title: brandName,
    meta_description:
      defaultPlatformConfig.seo.description ||
      "Shop online at your store.",
    robots_index: true,
    robots_follow: true,
  };
}
