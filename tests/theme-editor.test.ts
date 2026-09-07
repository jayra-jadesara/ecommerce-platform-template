import { describe, expect, it } from "vitest";
import {
  formValuesToAnimationConfig,
  formValuesToThemeConfig,
  themeConfigToFormValues,
  validateThemeEditorPayload,
  type ThemeEditorFormValues,
} from "@/features/admin/theme/editor-schema";
import { formValuesToThemeDbRow } from "@/features/admin/theme/map-to-db";
import { defaultPlatformConfig } from "@/config/defaults";
import { hasPermission } from "@/features/auth/permissions";

function sampleForm(
  overrides: Partial<ThemeEditorFormValues> = {},
): ThemeEditorFormValues {
  return {
    ...themeConfigToFormValues(
      defaultPlatformConfig.theme,
      defaultPlatformConfig.animation,
    ),
    ...overrides,
  };
}

describe("theme editor permissions", () => {
  it("allows SUPER_ADMIN and ADMIN to update theme", () => {
    expect(hasPermission(["SUPER_ADMIN"], "theme.update")).toBe(true);
    expect(hasPermission(["ADMIN"], "theme.update")).toBe(true);
  });

  it("allows EDITOR to view but not update", () => {
    expect(hasPermission(["EDITOR"], "theme.view")).toBe(true);
    expect(hasPermission(["EDITOR"], "theme.update")).toBe(false);
  });

  it("denies ORDER_MANAGER theme access", () => {
    expect(hasPermission(["ORDER_MANAGER"], "theme.view")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "theme.update")).toBe(false);
  });
});

describe("theme editor validation", () => {
  it("accepts a valid theme update payload", () => {
    const result = validateThemeEditorPayload(sampleForm());
    expect(result.ok).toBe(true);
  });

  it("rejects invalid colors", () => {
    const result = validateThemeEditorPayload(
      sampleForm({
        light: {
          ...defaultPlatformConfig.theme.light,
          primary: "url(javascript:alert(1))",
        },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects empty enabled modes", () => {
    const result = validateThemeEditorPayload(
      sampleForm({ enabledModes: [] as unknown as ThemeEditorFormValues["enabledModes"] }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects default mode outside enabled modes", () => {
    const result = validateThemeEditorPayload(
      sampleForm({
        defaultMode: "dark",
        enabledModes: ["light"],
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("maps animation none to disabled", () => {
    const animation = formValuesToAnimationConfig(
      sampleForm({ animationEnabled: true, animationIntensity: "none" }),
    );
    expect(animation.enabled).toBe(false);
  });

  it("maps high intensity to strong", () => {
    const animation = formValuesToAnimationConfig(
      sampleForm({ animationEnabled: true, animationIntensity: "high" }),
    );
    expect(animation).toEqual({
      enabled: true,
      intensity: "strong",
      defaultPreset: defaultPlatformConfig.animation.defaultPreset,
    });
  });

  it("builds db payload with semantic color columns", () => {
    const row = formValuesToThemeDbRow(
      sampleForm({
        light: {
          ...defaultPlatformConfig.theme.light,
          primary: "#112233",
          headerBackground: "#abcdef",
        },
      }),
    );
    expect(row.light_primary).toBe("#112233");
    expect(row.light_header_background).toBe("#abcdef");
    expect(row.enabled_modes.length).toBeGreaterThan(0);
  });

  it("round-trips theme config through form values", () => {
    const form = themeConfigToFormValues(
      defaultPlatformConfig.theme,
      defaultPlatformConfig.animation,
    );
    const theme = formValuesToThemeConfig(form);
    expect(theme.defaultMode).toBe(defaultPlatformConfig.theme.defaultMode);
    expect(theme.light.primary).toBe(defaultPlatformConfig.theme.light.primary);
  });
});
