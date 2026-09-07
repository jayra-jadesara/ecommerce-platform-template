import { describe, expect, it } from "vitest";
import { defaultPlatformConfig } from "@/config/defaults";
import {
  colorTokensToCssVars,
  serializeCssVars,
} from "@/features/theme/css-vars";
import {
  getAvailableThemeModes,
  canUserToggleTheme,
  sanitizeStoredMode,
  nextThemeMode,
} from "@/features/theme/modes";
import {
  mapAnimationRowToConfig,
  mapBrandingRowToConfig,
  mapThemeRowToConfig,
  getThemeModeFlags,
  type ThemeRow,
} from "@/features/theme/map-from-db";
import {
  isSafeColor,
  parseThemeConfig,
  completeColorTokens,
} from "@/features/theme/validation";
import type { ThemeConfig } from "@/types";

const validLight = defaultPlatformConfig.theme.light;
const validDark = defaultPlatformConfig.theme.dark;

function baseThemeRow(overrides: Partial<ThemeRow> = {}): ThemeRow {
  return {
    default_mode: "light",
    enabled_modes: ["light", "dark", "system"],
    allow_user_toggle: true,
    light_primary: validLight.primary,
    light_secondary: validLight.secondary,
    light_accent: validLight.accent,
    light_background: validLight.background,
    light_foreground: validLight.foreground,
    light_surface: validLight.surface,
    light_card: validLight.card,
    light_border: validLight.border,
    light_muted: validLight.muted,
    light_success: validLight.success,
    light_warning: validLight.warning,
    light_error: validLight.error,
    dark_primary: validDark.primary,
    dark_secondary: validDark.secondary,
    dark_accent: validDark.accent,
    dark_background: validDark.background,
    dark_foreground: validDark.foreground,
    dark_surface: validDark.surface,
    dark_card: validDark.card,
    dark_border: validDark.border,
    dark_muted: validDark.muted,
    dark_success: validDark.success,
    dark_warning: validDark.warning,
    dark_error: validDark.error,
    ...overrides,
  };
}

describe("color validation", () => {
  it("accepts hex and rgb", () => {
    expect(isSafeColor("#fff")).toBe(true);
    expect(isSafeColor("#1a5f4a")).toBe(true);
    expect(isSafeColor("rgb(26, 95, 74)")).toBe(true);
    expect(isSafeColor("rgba(26, 95, 74, 0.5)")).toBe(true);
  });

  it("rejects CSS injection payloads", () => {
    expect(isSafeColor("red")).toBe(false);
    expect(isSafeColor("url(javascript:alert(1))")).toBe(false);
    expect(isSafeColor("#1a5f4a; background: url(x)")).toBe(false);
    expect(isSafeColor("expression(alert(1))")).toBe(false);
  });
});

describe("parseThemeConfig", () => {
  it("parses a valid theme", () => {
    const parsed = parseThemeConfig(defaultPlatformConfig.theme);
    expect(parsed?.defaultMode).toBe("light");
    expect(parsed?.light.primary).toBe(validLight.primary);
  });

  it("rejects invalid theme and falls back via mapThemeRowToConfig", () => {
    expect(
      parseThemeConfig({
        ...defaultPlatformConfig.theme,
        light: { ...validLight, primary: "not-a-color" },
      }),
    ).toBeNull();

    const mapped = mapThemeRowToConfig(
      baseThemeRow({ light_primary: "javascript:evil()" }),
    );
    expect(mapped.light.primary).toBe(defaultPlatformConfig.theme.light.primary);
  });
});

describe("theme modes", () => {
  const lightOnly: ThemeConfig = {
    ...defaultPlatformConfig.theme,
    enabledModes: ["light"],
    defaultMode: "light",
  };

  const darkDisabled: ThemeConfig = {
    ...defaultPlatformConfig.theme,
    enabledModes: ["light", "system"],
    defaultMode: "light",
  };

  it("exposes only enabled modes", () => {
    expect(getAvailableThemeModes(lightOnly)).toEqual(["light"]);
    expect(getThemeModeFlags(darkDisabled)).toEqual({
      light_enabled: true,
      dark_enabled: false,
      system_enabled: true,
    });
  });

  it("hides toggle when only one mode is enabled", () => {
    expect(canUserToggleTheme(lightOnly)).toBe(false);
    expect(canUserToggleTheme(defaultPlatformConfig.theme)).toBe(true);
  });

  it("sanitizes localStorage against disabled modes", () => {
    expect(sanitizeStoredMode("dark", darkDisabled)).toBe("light");
    expect(sanitizeStoredMode("system", darkDisabled)).toBe("system");
  });

  it("cycles only through available modes", () => {
    expect(nextThemeMode("light", darkDisabled)).toBe("system");
    expect(nextThemeMode("system", darkDisabled)).toBe("light");
  });

  it("maps light and dark palettes from database rows", () => {
    const theme = mapThemeRowToConfig(
      baseThemeRow({
        light_primary: "#ff0000",
        dark_primary: "#00ff00",
        default_mode: "dark",
        enabled_modes: ["dark", "light"],
      }),
    );
    expect(theme.light.primary).toBe("#ff0000");
    expect(theme.dark.primary).toBe("#00ff00");
    expect(theme.defaultMode).toBe("dark");
  });
});

describe("css variables", () => {
  it("generates semantic CSS variables without injecting raw CSS", () => {
    const vars = colorTokensToCssVars(validLight);
    expect(vars["--color-primary"]).toBe(validLight.primary);
    expect(vars["--color-header-background"]).toBe(validLight.headerBackground);
    expect(vars["--color-button-foreground"]).toBe(validLight.buttonForeground);
    const serialized = serializeCssVars(vars);
    expect(serialized.includes(";") || serialized.includes("--color-primary")).toBe(
      true,
    );
    expect(serialized).not.toMatch(/url\(|expression\(|javascript:/i);
  });
});

describe("branding fallback", () => {
  it("falls back when branding is missing", () => {
    expect(mapBrandingRowToConfig(null).name).toBe(
      defaultPlatformConfig.brand.name,
    );
  });

  it("maps brand name from database", () => {
    const brand = mapBrandingRowToConfig({
      brand_name: "Acme Store",
      tagline: "Hello",
      logo_path: null,
      logo_dark_path: null,
      favicon_path: null,
      social_sharing_image_path: null,
    });
    expect(brand.name).toBe("Acme Store");
    expect(brand.tagline).toBe("Hello");
  });
});

describe("animation fallback", () => {
  it("falls back on invalid preset", () => {
    const animation = mapAnimationRowToConfig({
      enabled: true,
      preset: "explode-everything",
      intensity: "medium",
    });
    expect(animation.defaultPreset).toBe("fade-up");
  });

  it("maps valid animation settings", () => {
    const animation = mapAnimationRowToConfig({
      enabled: false,
      preset: "scale",
      intensity: "subtle",
    });
    expect(animation).toEqual({
      enabled: false,
      defaultPreset: "scale",
      intensity: "subtle",
    });
  });
});

describe("completeColorTokens", () => {
  it("derives chrome tokens when omitted", () => {
    const tokens = completeColorTokens(
      {
        primary: "#111111",
        secondary: "#222222",
        accent: "#333333",
        background: "#444444",
        foreground: "#555555",
        surface: "#666666",
        card: "#777777",
        border: "#888888",
        muted: "#999999",
        success: "#00aa00",
        warning: "#aaaa00",
        error: "#aa0000",
      },
      "#ffffff",
    );
    expect(tokens?.headerBackground).toBe("#666666");
    expect(tokens?.buttonBackground).toBe("#111111");
    expect(tokens?.buttonForeground).toBe("#ffffff");
  });
});
