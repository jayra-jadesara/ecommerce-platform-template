import { z } from "zod";
import {
  animationPresetSchema,
  colorTokensSchema,
  themeModeSchema,
} from "@/features/theme/validation";
import {
  VISUAL_3D_PRESETS,
  VISUAL_3D_QUALITY,
} from "@/features/visual-effects/schemas";
import type {
  AnimationConfig,
  ThemeConfig,
  VisualEffectsConfig,
} from "@/types";

export const BORDER_RADIUS_PRESETS = {
  none: "0px",
  small: "4px",
  medium: "8px",
  large: "12px",
  xlarge: "16px",
} as const;

export type BorderRadiusPreset = keyof typeof BORDER_RADIUS_PRESETS;

export const SAFE_FONT_OPTIONS = [
  {
    id: "dm_sans",
    label: "DM Sans",
    css: "var(--font-sans)",
  },
  {
    id: "fraunces",
    label: "Fraunces",
    css: "var(--font-display)",
  },
  {
    id: "jetbrains_mono",
    label: "JetBrains Mono",
    css: "var(--font-mono)",
  },
  {
    id: "system_ui",
    label: "System UI",
    css: "system-ui, sans-serif",
  },
  {
    id: "georgia",
    label: "Georgia",
    css: "Georgia, 'Times New Roman', serif",
  },
] as const;

export type SafeFontId = (typeof SAFE_FONT_OPTIONS)[number]["id"];

export const ANIMATION_INTENSITY_UI = [
  "none",
  "subtle",
  "medium",
  "high",
] as const;

export type AnimationIntensityUi = (typeof ANIMATION_INTENSITY_UI)[number];

const safeFontIdSchema = z.enum([
  "dm_sans",
  "fraunces",
  "jetbrains_mono",
  "system_ui",
  "georgia",
]);

const borderRadiusPresetSchema = z.enum([
  "none",
  "small",
  "medium",
  "large",
  "xlarge",
]);

export const themeEditorFormSchema = z
  .object({
    defaultMode: themeModeSchema,
    enabledModes: z
      .array(themeModeSchema)
      .min(1, "Enable at least one appearance mode"),
    allowUserToggle: z.boolean(),
    light: colorTokensSchema,
    dark: colorTokensSchema,
    borderRadiusPreset: borderRadiusPresetSchema,
    fontSans: safeFontIdSchema,
    fontDisplay: safeFontIdSchema,
    animationEnabled: z.boolean(),
    animationIntensity: z.enum(["none", "subtle", "medium", "high"]),
    animationPreset: animationPresetSchema,
    // 3D & Visual Effects (business-facing; allow-listed values only)
    visual3dEnabled: z.boolean(),
    visual3dHeroEnabled: z.boolean(),
    visual3dProductEnabled: z.boolean(),
    visual3dQuality: z.enum(VISUAL_3D_QUALITY),
    visual3dHeroPreset: z.enum(VISUAL_3D_PRESETS),
    visual3dMobileEnabled: z.boolean(),
    visual3dRespectReducedMotion: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.enabledModes.includes(value.defaultMode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Default mode must be one of the enabled modes",
        path: ["defaultMode"],
      });
    }
  });

export type ThemeEditorFormValues = z.infer<typeof themeEditorFormSchema>;

export function fontIdToCss(id: SafeFontId): string {
  return (
    SAFE_FONT_OPTIONS.find((option) => option.id === id)?.css ??
    "var(--font-sans)"
  );
}

export function cssToFontId(css: string | undefined): SafeFontId {
  const match = SAFE_FONT_OPTIONS.find((option) => option.css === css);
  return match?.id ?? "dm_sans";
}

export function radiusToPreset(radius: string | undefined): BorderRadiusPreset {
  const entry = (
    Object.entries(BORDER_RADIUS_PRESETS) as Array<
      [BorderRadiusPreset, string]
    >
  ).find(([, value]) => value === radius);
  return entry?.[0] ?? "medium";
}

export function themeConfigToFormValues(
  theme: ThemeConfig,
  animation: AnimationConfig,
  fonts?: { fontSans?: string; fontDisplay?: string },
  visualEffects?: VisualEffectsConfig,
): ThemeEditorFormValues {
  const intensityUi: AnimationIntensityUi = !animation.enabled
    ? "none"
    : animation.intensity === "strong"
      ? "high"
      : animation.intensity;

  const ve = visualEffects ?? {
    enabled: false,
    heroEnabled: false,
    productEnabled: false,
    quality: "MEDIUM" as const,
    heroPreset: "NONE" as const,
    mobileEnabled: false,
    respectReducedMotion: true,
  };

  return {
    defaultMode: theme.defaultMode,
    enabledModes: [...theme.enabledModes],
    allowUserToggle: theme.allowUserToggle,
    light: { ...theme.light },
    dark: { ...theme.dark },
    borderRadiusPreset: radiusToPreset(theme.borderRadius),
    fontSans: cssToFontId(fonts?.fontSans),
    fontDisplay: cssToFontId(fonts?.fontDisplay),
    animationEnabled: animation.enabled && intensityUi !== "none",
    animationIntensity: intensityUi,
    animationPreset: animation.defaultPreset,
    visual3dEnabled: ve.enabled,
    visual3dHeroEnabled: ve.heroEnabled,
    visual3dProductEnabled: ve.productEnabled,
    visual3dQuality: ve.quality,
    visual3dHeroPreset: ve.heroPreset,
    visual3dMobileEnabled: ve.mobileEnabled,
    visual3dRespectReducedMotion: ve.respectReducedMotion,
  };
}

export function formValuesToThemeConfig(
  values: ThemeEditorFormValues,
): ThemeConfig {
  return {
    defaultMode: values.defaultMode,
    allowUserToggle: values.allowUserToggle,
    enabledModes: values.enabledModes,
    light: values.light,
    dark: values.dark,
    borderRadius: BORDER_RADIUS_PRESETS[values.borderRadiusPreset],
  };
}

export function formValuesToAnimationConfig(
  values: ThemeEditorFormValues,
): AnimationConfig {
  if (!values.animationEnabled || values.animationIntensity === "none") {
    return {
      enabled: false,
      intensity: "medium",
      defaultPreset: values.animationPreset,
    };
  }

  return {
    enabled: true,
    intensity:
      values.animationIntensity === "high"
        ? "strong"
        : values.animationIntensity,
    defaultPreset: values.animationPreset,
  };
}

export function formValuesToVisualEffectsConfig(
  values: ThemeEditorFormValues,
): VisualEffectsConfig {
  return {
    enabled: values.visual3dEnabled,
    heroEnabled: values.visual3dHeroEnabled,
    productEnabled: values.visual3dProductEnabled,
    quality: values.visual3dQuality,
    heroPreset: values.visual3dHeroPreset,
    mobileEnabled: values.visual3dMobileEnabled,
    respectReducedMotion: values.visual3dRespectReducedMotion,
  };
}

/** Pure validation used by server action + tests. */
export function validateThemeEditorPayload(input: unknown):
  | { ok: true; data: ThemeEditorFormValues }
  | { ok: false; error: string } {
  const parsed = themeEditorFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid theme configuration.",
    };
  }
  return { ok: true, data: parsed.data };
}
