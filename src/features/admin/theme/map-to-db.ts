import type { ThemeEditorFormValues } from "@/features/admin/theme/editor-schema";
import {
  BORDER_RADIUS_PRESETS,
  fontIdToCss,
  formValuesToAnimationConfig,
} from "@/features/admin/theme/editor-schema";

export type ThemeDbWrite = {
  default_mode: ThemeEditorFormValues["defaultMode"];
  enabled_modes: ThemeEditorFormValues["enabledModes"];
  allow_user_toggle: boolean;
  border_radius: string;
  font_sans: string;
  font_display: string;
  font_mono: string;
  heading_highlight_style: string;
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
  light_header_background: string;
  light_header_foreground: string;
  light_footer_background: string;
  light_footer_foreground: string;
  light_button_background: string;
  light_button_foreground: string;
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
  dark_header_background: string;
  dark_header_foreground: string;
  dark_footer_background: string;
  dark_footer_foreground: string;
  dark_button_background: string;
  dark_button_foreground: string;
};

export function formValuesToThemeDbRow(
  values: ThemeEditorFormValues,
): ThemeDbWrite {
  const { light, dark } = values;
  return {
    default_mode: values.defaultMode,
    enabled_modes: values.enabledModes,
    allow_user_toggle: values.allowUserToggle,
    border_radius: BORDER_RADIUS_PRESETS[values.borderRadiusPreset],
    font_sans: fontIdToCss(values.fontSans),
    font_display: fontIdToCss(values.fontDisplay),
    font_mono: "var(--font-mono)",
    heading_highlight_style: values.headingHighlightStyle,
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
    light_header_background: light.headerBackground,
    light_header_foreground: light.headerForeground,
    light_footer_background: light.footerBackground,
    light_footer_foreground: light.footerForeground,
    light_button_background: light.buttonBackground,
    light_button_foreground: light.buttonForeground,
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
    dark_header_background: dark.headerBackground,
    dark_header_foreground: dark.headerForeground,
    dark_footer_background: dark.footerBackground,
    dark_footer_foreground: dark.footerForeground,
    dark_button_background: dark.buttonBackground,
    dark_button_foreground: dark.buttonForeground,
  };
}

export function formValuesToAnimationDbRow(values: ThemeEditorFormValues) {
  const animation = formValuesToAnimationConfig(values);
  return {
    enabled: animation.enabled,
    intensity: animation.intensity,
    preset: animation.defaultPreset,
  };
}

export function formValuesToVisualEffectsDbRow(values: ThemeEditorFormValues) {
  return {
    enabled: values.visual3dEnabled,
    hero_enabled: values.visual3dHeroEnabled,
    product_enabled: values.visual3dProductEnabled,
    quality: values.visual3dQuality,
    hero_preset: values.visual3dHeroPreset,
    mobile_enabled: values.visual3dMobileEnabled,
    respect_reduced_motion: values.visual3dRespectReducedMotion,
  };
}

export function diffThemeKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const key of keys) {
    const left = JSON.stringify(before[key] ?? null);
    const right = JSON.stringify(after[key] ?? null);
    if (left !== right) changed.push(key);
  }
  return changed;
}
