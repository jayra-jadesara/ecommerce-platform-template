import { z } from "zod";
import type {
  AnimationConfig,
  AnimationIntensity,
  AnimationPreset,
  ColorTokens,
  ThemeConfig,
  ThemeMode,
} from "@/types";

/** Safe color formats only — blocks arbitrary CSS injection. */
export const safeColorSchema = z
  .string()
  .trim()
  .regex(
    /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+\s*)?\)|hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%(?:\s*,\s*[\d.]+\s*)?\))$/,
    "Invalid color format",
  );

export const themeModeSchema = z.enum(["light", "dark", "system"]);

export const colorTokensSchema = z.object({
  primary: safeColorSchema,
  secondary: safeColorSchema,
  accent: safeColorSchema,
  background: safeColorSchema,
  foreground: safeColorSchema,
  surface: safeColorSchema,
  card: safeColorSchema,
  border: safeColorSchema,
  muted: safeColorSchema,
  success: safeColorSchema,
  warning: safeColorSchema,
  error: safeColorSchema,
  headerBackground: safeColorSchema,
  headerForeground: safeColorSchema,
  footerBackground: safeColorSchema,
  footerForeground: safeColorSchema,
  buttonBackground: safeColorSchema,
  buttonForeground: safeColorSchema,
});

export const themeConfigSchema = z
  .object({
    defaultMode: themeModeSchema,
    allowUserToggle: z.boolean(),
    enabledModes: z.array(themeModeSchema).min(1),
    light: colorTokensSchema,
    dark: colorTokensSchema,
    borderRadius: z
      .string()
      .trim()
      .regex(/^\d+(\.\d+)?(px|rem|em)$/, "Invalid border radius")
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.enabledModes.includes(value.defaultMode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "defaultMode must be included in enabledModes",
        path: ["defaultMode"],
      });
    }
  });

export const animationPresetSchema = z.enum([
  "fade",
  "fade-up",
  "fade-down",
  "slide-up",
  "slide-down",
  "scale",
  "none",
]);

export const animationIntensitySchema = z.enum(["subtle", "medium", "strong"]);

export const animationConfigSchema = z.object({
  enabled: z.boolean(),
  intensity: animationIntensitySchema,
  defaultPreset: animationPresetSchema,
});

export function parseThemeConfig(input: unknown): ThemeConfig | null {
  const result = themeConfigSchema.safeParse(input);
  return result.success ? (result.data as ThemeConfig) : null;
}

export function parseAnimationConfig(input: unknown): AnimationConfig | null {
  const result = animationConfigSchema.safeParse(input);
  return result.success ? (result.data as AnimationConfig) : null;
}

export function isSafeColor(value: string): boolean {
  return safeColorSchema.safeParse(value).success;
}

export function coerceThemeMode(
  value: unknown,
  fallback: ThemeMode = "light",
): ThemeMode {
  const result = themeModeSchema.safeParse(value);
  return result.success ? result.data : fallback;
}

export function coerceAnimationPreset(
  value: unknown,
  fallback: AnimationPreset = "fade-up",
): AnimationPreset {
  const result = animationPresetSchema.safeParse(value);
  return result.success ? result.data : fallback;
}

export function coerceAnimationIntensity(
  value: unknown,
  fallback: AnimationIntensity = "medium",
): AnimationIntensity {
  const result = animationIntensitySchema.safeParse(value);
  return result.success ? result.data : fallback;
}

/** Ensures tokens are complete; fills chrome from semantic base when missing. */
export function completeColorTokens(
  partial: Partial<ColorTokens> &
    Pick<
      ColorTokens,
      | "primary"
      | "secondary"
      | "accent"
      | "background"
      | "foreground"
      | "surface"
      | "card"
      | "border"
      | "muted"
      | "success"
      | "warning"
      | "error"
    >,
  buttonForegroundFallback: string,
): ColorTokens | null {
  const candidate: ColorTokens = {
    primary: partial.primary,
    secondary: partial.secondary,
    accent: partial.accent,
    background: partial.background,
    foreground: partial.foreground,
    surface: partial.surface,
    card: partial.card,
    border: partial.border,
    muted: partial.muted,
    success: partial.success,
    warning: partial.warning,
    error: partial.error,
    headerBackground: partial.headerBackground ?? partial.surface,
    headerForeground: partial.headerForeground ?? partial.foreground,
    footerBackground: partial.footerBackground ?? partial.surface,
    footerForeground: partial.footerForeground ?? partial.muted,
    buttonBackground: partial.buttonBackground ?? partial.primary,
    buttonForeground:
      partial.buttonForeground ?? buttonForegroundFallback,
  };

  const parsed = colorTokensSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
