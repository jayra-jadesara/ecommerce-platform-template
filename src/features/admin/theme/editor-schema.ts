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
import {
  HEADING_HIGHLIGHT_STYLES,
  coerceHeadingHighlightStyle,
  type HeadingHighlightStyle,
} from "@/features/theme/heading-highlight";
import type {
  AnimationConfig,
  ThemeConfig,
  VisualEffectsConfig,
} from "@/types";
import { zodValidationFailure, type FieldErrors } from "@/lib/validation";

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
    css: "var(--font-dm-sans)",
    mood: "Clean",
    bestFor: "both" as const,
    blurb: "Friendly modern store default",
  },
  {
    id: "plus_jakarta",
    label: "Plus Jakarta",
    css: "var(--font-plus-jakarta)",
    mood: "Polished",
    bestFor: "body" as const,
    blurb: "Contemporary DTC body text",
  },
  {
    id: "manrope",
    label: "Manrope",
    css: "var(--font-manrope)",
    mood: "Refined",
    bestFor: "body" as const,
    blurb: "Soft geometric sans for catalogs",
  },
  {
    id: "outfit",
    label: "Outfit",
    css: "var(--font-outfit)",
    mood: "Modern",
    bestFor: "both" as const,
    blurb: "Premium sans for brand + UI",
  },
  {
    id: "space_grotesk",
    label: "Space Grotesk",
    css: "var(--font-space-grotesk)",
    mood: "Bold",
    bestFor: "heading" as const,
    blurb: "Distinctive tech / lifestyle titles",
  },
  {
    id: "syne",
    label: "Syne",
    css: "var(--font-syne)",
    mood: "Statement",
    bestFor: "heading" as const,
    blurb: "Strong brand display energy",
  },
  {
    id: "fraunces",
    label: "Fraunces",
    css: "var(--font-fraunces)",
    mood: "Warm",
    bestFor: "heading" as const,
    blurb: "Soft serif with personality",
  },
  {
    id: "playfair",
    label: "Playfair Display",
    css: "var(--font-playfair)",
    mood: "Luxury",
    bestFor: "heading" as const,
    blurb: "Classic premium ecommerce titles",
  },
  {
    id: "cormorant",
    label: "Cormorant",
    css: "var(--font-cormorant)",
    mood: "Editorial",
    bestFor: "heading" as const,
    blurb: "High-end magazine elegance",
  },
  {
    id: "libre_baskerville",
    label: "Libre Baskerville",
    css: "var(--font-libre-baskerville)",
    mood: "Heritage",
    bestFor: "heading" as const,
    blurb: "Timeless serif authority",
  },
  {
    id: "lora",
    label: "Lora",
    css: "var(--font-lora)",
    mood: "Readable",
    bestFor: "body" as const,
    blurb: "Elegant serif for long copy",
  },
  {
    id: "jetbrains_mono",
    label: "JetBrains Mono",
    css: "var(--font-jetbrains-mono)",
    mood: "Technical",
    bestFor: "both" as const,
    blurb: "Monospace for modern brands",
  },
  {
    id: "system_ui",
    label: "System UI",
    css: "system-ui, sans-serif",
    mood: "Native",
    bestFor: "body" as const,
    blurb: "Device default — fast & familiar",
  },
  {
    id: "georgia",
    label: "Georgia",
    css: "Georgia, 'Times New Roman', serif",
    mood: "Classic",
    bestFor: "heading" as const,
    blurb: "Built-in serif fallback",
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

const safeFontIdSchema = z.enum(
  SAFE_FONT_OPTIONS.map((option) => option.id) as [
    SafeFontId,
    ...SafeFontId[],
  ],
);

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
    headingHighlightStyle: z.enum(HEADING_HIGHLIGHT_STYLES),
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
    "var(--font-dm-sans)"
  );
}

/** Map stored CSS (including legacy role vars) back to a safe font id. */
export function cssToFontId(css: string | undefined): SafeFontId {
  if (!css) return "dm_sans";
  const exact = SAFE_FONT_OPTIONS.find((option) => option.css === css);
  if (exact) return exact.id;
  // Legacy DB values pointed at semantic roles before face tokens existed.
  if (css === "var(--font-sans)") return "dm_sans";
  if (css === "var(--font-display)") return "fraunces";
  if (css === "var(--font-mono)") return "jetbrains_mono";
  return "dm_sans";
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
  fonts?: {
    fontSans?: string;
    fontDisplay?: string;
    headingHighlightStyle?: string;
  },
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
    headingHighlightStyle: coerceHeadingHighlightStyle(
      fonts?.headingHighlightStyle,
      "double",
    ) as HeadingHighlightStyle,
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
    respectReducedMotion: true,
  };
}

/** Pure validation used by server action + tests. */
export function validateThemeEditorPayload(input: unknown):
  | { ok: true; data: ThemeEditorFormValues }
  | { ok: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = themeEditorFormSchema.safeParse(input);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid theme configuration.");
  }
  return { ok: true, data: parsed.data };
}
