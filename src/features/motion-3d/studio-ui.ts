/**
 * Phase 25.3 — business-facing Motion & 3D Design Studio mappings.
 * UI labels never expose technical engine terms; values map onto existing
 * store_animation_settings + store_visual_effects_settings + theme tokens.
 */

import type { AnimationPreset } from "@/types";
import type { ThemeEditorFormValues } from "@/features/admin/theme/editor-schema";
import {
  applyMotionStylePreset,
  applyThreeStylePreset,
  inferMotionStyle,
  inferThreeStyle,
  type MotionStylePreset,
  type ThreeStylePreset,
} from "@/features/motion-3d";

/** Admin-facing Store Feel (Bold = strongest safe DYNAMIC). */
export const STORE_FEEL_OPTIONS = [
  "CALM",
  "MODERN",
  "LIVELY",
  "BOLD",
] as const;
export type StoreFeel = (typeof STORE_FEEL_OPTIONS)[number];

/** @deprecated Use BOLD — kept for older tests / imports. */
export type StoreFeelLegacy = StoreFeel | "DYNAMIC";

export const STORE_FEEL_COPY: Record<
  StoreFeel,
  { title: string; description: string; previewClass: string }
> = {
  CALM: {
    title: "Calm",
    description: "Simple and relaxed",
    previewClass: "sf-feel-calm",
  },
  MODERN: {
    title: "Modern",
    description: "Clean movement and gentle interactions",
    previewClass: "sf-feel-modern",
  },
  LIVELY: {
    title: "Lively",
    description: "More noticeable movement and hover effects",
    previewClass: "sf-feel-lively",
  },
  BOLD: {
    title: "Bold",
    description: "Stronger motion for an energetic store",
    previewClass: "sf-feel-dynamic",
  },
};

export const IMAGE_MOTION_OPTIONS = [
  "none",
  "gentle-zoom",
  "lift",
  "float",
] as const;
export type ImageMotionOption = (typeof IMAGE_MOTION_OPTIONS)[number];

export const IMAGE_MOTION_COPY: Record<
  ImageMotionOption,
  { title: string; description: string }
> = {
  none: { title: "None", description: "Still product images" },
  "gentle-zoom": { title: "Gentle Zoom", description: "Soft zoom on hover" },
  lift: { title: "Lift", description: "Image rises slightly" },
  float: { title: "Float", description: "Very subtle drift" },
};

export const CARD_MOTION_OPTIONS = [
  "clean",
  "lift",
  "zoom",
  "float",
  "glow",
] as const;
export type CardMotionOption = (typeof CARD_MOTION_OPTIONS)[number];

export const CARD_MOTION_COPY: Record<
  CardMotionOption,
  { title: string; description: string }
> = {
  clean: { title: "Clean", description: "No card movement" },
  lift: { title: "Lift", description: "Card rises slightly" },
  zoom: { title: "Zoom", description: "Gentle scale on hover" },
  float: { title: "Float", description: "Very subtle motion" },
  glow: { title: "Glow", description: "Soft accent emphasis" },
};

export const BUTTON_STYLE_OPTIONS = [
  "solid",
  "outline",
  "soft",
  "pill",
  "floating",
] as const;
export type ButtonStyleOption = (typeof BUTTON_STYLE_OPTIONS)[number];

export const BUTTON_HOVER_OPTIONS = ["none", "lift", "glow", "scale"] as const;
export type ButtonHoverOption = (typeof BUTTON_HOVER_OPTIONS)[number];

export const THREE_FEEL_OPTIONS = [
  "NONE",
  "SOFT",
  "PREMIUM",
  "IMMERSIVE",
] as const;
export type ThreeFeel = (typeof THREE_FEEL_OPTIONS)[number];

export const THREE_FEEL_COPY: Record<
  ThreeFeel,
  { title: string; description: string }
> = {
  NONE: { title: "None", description: "No 3D effects" },
  SOFT: { title: "Soft", description: "Gentle depth accents" },
  PREMIUM: { title: "Premium", description: "Polished hero & product depth" },
  IMMERSIVE: {
    title: "Immersive",
    description: "Richer layered depth (desktop)",
  },
};

export const MOBILE_3D_UI = ["off", "light", "full"] as const;
export type Mobile3dUi = (typeof MOBILE_3D_UI)[number];

export const PERFORMANCE_UI = ["balanced", "high"] as const;
export type PerformanceUi = (typeof PERFORMANCE_UI)[number];

function storeFeelToInternal(feel: StoreFeel): MotionStylePreset {
  switch (feel) {
    case "CALM":
      return "MINIMAL";
    case "LIVELY":
    case "BOLD":
      return "DYNAMIC";
    case "MODERN":
    default:
      return "MODERN";
  }
}

export function applyStoreFeel(
  feel: StoreFeel | "DYNAMIC",
): Pick<
  ThemeEditorFormValues,
  "animationEnabled" | "animationIntensity" | "animationPreset"
> {
  const normalized: StoreFeel = feel === "DYNAMIC" ? "BOLD" : feel;
  if (normalized === "LIVELY") {
    return {
      animationEnabled: true,
      animationIntensity: "medium",
      animationPreset: "scale",
    };
  }
  if (normalized === "BOLD") {
    return {
      animationEnabled: true,
      animationIntensity: "high",
      animationPreset: "fade-up",
    };
  }
  const next = applyMotionStylePreset(storeFeelToInternal(normalized));
  return {
    animationEnabled: next.enabled,
    animationIntensity: !next.enabled
      ? "none"
      : next.intensity === "strong"
        ? "high"
        : next.intensity,
    animationPreset: next.defaultPreset,
  };
}

export function inferStoreFeel(values: ThemeEditorFormValues): StoreFeel {
  if (!values.animationEnabled || values.animationIntensity === "none") {
    return "CALM";
  }
  if (values.animationIntensity === "high") {
    return "BOLD";
  }
  const style = inferMotionStyle({
    enabled: values.animationEnabled,
    intensity:
      values.animationIntensity === "subtle" ? "subtle" : "medium",
    defaultPreset: values.animationPreset,
  });
  if (style === "NONE" || style === "MINIMAL") return "CALM";
  if (
    values.animationPreset === "scale" ||
    values.animationPreset === "slide-up"
  ) {
    return "LIVELY";
  }
  return "MODERN";
}

export function inferImageMotion(
  values: ThemeEditorFormValues,
): ImageMotionOption {
  if (!values.animationEnabled || values.animationPreset === "none") {
    return "none";
  }
  if (values.animationPreset === "scale") return "gentle-zoom";
  if (values.animationPreset === "slide-up") return "float";
  if (
    values.animationPreset === "fade-up" ||
    values.animationPreset === "fade-down"
  ) {
    return "lift";
  }
  return "gentle-zoom";
}

export function applyImageMotion(
  option: ImageMotionOption,
  current: ThemeEditorFormValues,
): Pick<
  ThemeEditorFormValues,
  "animationEnabled" | "animationPreset" | "animationIntensity"
> {
  if (option === "none") {
    return {
      animationEnabled: current.animationEnabled,
      animationPreset: "none",
      animationIntensity: current.animationIntensity,
    };
  }
  const preset: AnimationPreset =
    option === "gentle-zoom"
      ? "scale"
      : option === "float"
        ? "slide-up"
        : "fade-up";
  return {
    animationEnabled: true,
    animationPreset: preset,
    animationIntensity:
      current.animationIntensity === "none"
        ? "medium"
        : current.animationIntensity,
  };
}

export function inferCardMotion(
  values: ThemeEditorFormValues,
): CardMotionOption {
  if (!values.animationEnabled || values.animationIntensity === "none") {
    return "clean";
  }
  if (values.animationIntensity === "high") return "zoom";
  if (values.animationIntensity === "subtle") return "float";
  if (values.animationPreset === "fade") return "glow";
  return "lift";
}

export function applyCardMotion(
  option: CardMotionOption,
): Pick<
  ThemeEditorFormValues,
  "animationEnabled" | "animationIntensity" | "animationPreset"
> {
  switch (option) {
    case "clean":
      return {
        animationEnabled: true,
        animationIntensity: "none",
        animationPreset: "fade",
      };
    case "zoom":
      return {
        animationEnabled: true,
        animationIntensity: "high",
        animationPreset: "scale",
      };
    case "float":
      return {
        animationEnabled: true,
        animationIntensity: "subtle",
        animationPreset: "slide-up",
      };
    case "glow":
      return {
        animationEnabled: true,
        animationIntensity: "medium",
        animationPreset: "fade",
      };
    case "lift":
    default:
      return {
        animationEnabled: true,
        animationIntensity: "medium",
        animationPreset: "fade-up",
      };
  }
}

export function inferButtonStyle(
  values: ThemeEditorFormValues,
): ButtonStyleOption {
  const bg = (values.light.buttonBackground || "").toLowerCase();
  const primary = (values.light.primary || "").toLowerCase();
  const surface = (values.light.surface || "").toLowerCase();
  const card = (values.light.card || "").toLowerCase();
  const radius = values.borderRadiusPreset;

  if (bg && surface && bg === surface) return "soft";
  if (bg && card && bg === card) return "outline";
  if (bg && primary && bg === primary) {
    if (radius === "xlarge") return "floating";
    if (radius === "large") return "pill";
    return "solid";
  }
  if (radius === "xlarge") return "floating";
  if (radius === "large") return "pill";
  if (radius === "small" || radius === "none") return "outline";
  return "solid";
}

export function applyButtonStyle(
  option: ButtonStyleOption,
  values: ThemeEditorFormValues,
): Partial<ThemeEditorFormValues> {
  const patch: Partial<ThemeEditorFormValues> = {};
  switch (option) {
    case "floating":
      patch.borderRadiusPreset = "xlarge";
      break;
    case "pill":
      patch.borderRadiusPreset = "large";
      break;
    case "soft":
    case "outline":
    case "solid":
    default:
      patch.borderRadiusPreset = "medium";
      break;
  }

  const light = { ...values.light };
  const dark = { ...values.dark };
  if (option === "soft") {
    light.buttonBackground = light.surface;
    light.buttonForeground = light.primary;
    dark.buttonBackground = dark.surface;
    dark.buttonForeground = dark.primary;
  } else if (option === "outline") {
    light.buttonBackground = light.card;
    light.buttonForeground = light.primary;
    dark.buttonBackground = dark.card;
    dark.buttonForeground = dark.primary;
  } else {
    light.buttonBackground = light.primary;
    light.buttonForeground = light.background;
    dark.buttonBackground = dark.primary;
    dark.buttonForeground = dark.background;
  }
  patch.light = light;
  patch.dark = dark;
  return patch;
}

export function inferButtonHover(
  values: ThemeEditorFormValues,
): ButtonHoverOption {
  if (!values.animationEnabled || values.animationIntensity === "none") {
    return "none";
  }
  if (values.animationIntensity === "high") return "scale";
  if (values.animationIntensity === "subtle") return "lift";
  return "glow";
}

export function applyButtonHover(
  option: ButtonHoverOption,
): Pick<ThemeEditorFormValues, "animationEnabled" | "animationIntensity"> {
  if (option === "none") {
    return { animationEnabled: true, animationIntensity: "none" };
  }
  return {
    animationEnabled: true,
    animationIntensity:
      option === "scale" ? "high" : option === "lift" ? "subtle" : "medium",
  };
}

export function inferThreeFeel(values: ThemeEditorFormValues): ThreeFeel {
  if (!values.visual3dEnabled) return "NONE";
  return inferThreeStyle({
    enabled: values.visual3dEnabled,
    heroEnabled: values.visual3dHeroEnabled,
    productEnabled: values.visual3dProductEnabled,
    quality: values.visual3dQuality,
    heroPreset: values.visual3dHeroPreset,
    mobileEnabled: values.visual3dMobileEnabled,
    respectReducedMotion: values.visual3dRespectReducedMotion,
  });
}

export function applyThreeFeel(
  feel: ThreeFeel,
): Pick<
  ThemeEditorFormValues,
  | "visual3dEnabled"
  | "visual3dHeroEnabled"
  | "visual3dProductEnabled"
  | "visual3dQuality"
  | "visual3dHeroPreset"
  | "visual3dMobileEnabled"
> {
  const next = applyThreeStylePreset(feel as ThreeStylePreset);
  return {
    visual3dEnabled: next.enabled,
    visual3dHeroEnabled: next.heroEnabled,
    visual3dProductEnabled: next.productEnabled,
    visual3dQuality: next.quality,
    visual3dHeroPreset: next.heroPreset,
    visual3dMobileEnabled: next.mobileEnabled,
  };
}

export function inferMobile3dUi(values: ThemeEditorFormValues): Mobile3dUi {
  if (!values.visual3dMobileEnabled) return "off";
  return values.visual3dQuality === "HIGH" ? "full" : "light";
}

export function applyMobile3dUi(
  option: Mobile3dUi,
): Pick<ThemeEditorFormValues, "visual3dMobileEnabled" | "visual3dQuality"> {
  if (option === "off") {
    return { visual3dMobileEnabled: false, visual3dQuality: "MEDIUM" };
  }
  return {
    visual3dMobileEnabled: true,
    visual3dQuality: option === "full" ? "HIGH" : "LOW",
  };
}

export function inferPerformanceUi(
  values: ThemeEditorFormValues,
): PerformanceUi {
  return values.visual3dQuality === "HIGH" ? "high" : "balanced";
}

export function applyPerformanceUi(
  option: PerformanceUi,
): Pick<ThemeEditorFormValues, "visual3dQuality"> {
  return { visual3dQuality: option === "high" ? "HIGH" : "MEDIUM" };
}

export function applyRecommendedMotion3d(): Partial<ThemeEditorFormValues> {
  return {
    ...applyStoreFeel("MODERN"),
    ...applyThreeFeel("NONE"),
    visual3dMobileEnabled: false,
    visual3dRespectReducedMotion: true,
    borderRadiusPreset: "medium",
  };
}

export const FORBIDDEN_STUDIO_TERMS = [
  "WebGL",
  "Three.js",
  "R3F",
  "DPR",
  "shader",
  "render loop",
  "FLOATING_SHAPES",
  "PRODUCT_ORBIT",
  "ABSTRACT_PARTICLES",
] as const;

/** Legacy aliases used by older call sites / tests. */
export const BUTTON_MOTION_OPTIONS = [
  "none",
  "subtle",
  "smooth",
  "playful",
] as const;
export type ButtonMotionOption = (typeof BUTTON_MOTION_OPTIONS)[number];

export function inferButtonMotion(
  values: ThemeEditorFormValues,
): ButtonMotionOption {
  if (!values.animationEnabled || values.animationIntensity === "none") {
    return "none";
  }
  if (values.animationIntensity === "high") return "playful";
  if (values.animationIntensity === "subtle") return "subtle";
  return "smooth";
}

export function applyButtonMotion(
  option: ButtonMotionOption,
): Pick<ThemeEditorFormValues, "animationEnabled" | "animationIntensity"> {
  if (option === "none") {
    return { animationEnabled: false, animationIntensity: "none" };
  }
  return {
    animationEnabled: true,
    animationIntensity:
      option === "playful"
        ? "high"
        : option === "subtle"
          ? "subtle"
          : "medium",
  };
}

export const PAGE_MOTION_OPTIONS = [
  "none",
  "fade",
  "rise",
  "soft-reveal",
] as const;
export type PageMotionOption = (typeof PAGE_MOTION_OPTIONS)[number];

export const SCROLL_MOTION_OPTIONS = ["off", "gentle", "smooth"] as const;
export type ScrollMotionOption = (typeof SCROLL_MOTION_OPTIONS)[number];

export function inferPageMotion(
  values: ThemeEditorFormValues,
): PageMotionOption {
  if (!values.animationEnabled || values.animationPreset === "none") {
    return "none";
  }
  if (values.animationPreset === "fade") return "fade";
  if (
    values.animationPreset === "fade-up" ||
    values.animationPreset === "slide-up"
  ) {
    return "rise";
  }
  return "soft-reveal";
}

export function applyPageMotion(
  option: PageMotionOption,
): Pick<
  ThemeEditorFormValues,
  "animationEnabled" | "animationPreset" | "animationIntensity"
> {
  if (option === "none") {
    return {
      animationEnabled: false,
      animationPreset: "none",
      animationIntensity: "none",
    };
  }
  const preset: AnimationPreset =
    option === "fade" ? "fade" : option === "rise" ? "fade-up" : "fade";
  return {
    animationEnabled: true,
    animationPreset: preset,
    animationIntensity: option === "soft-reveal" ? "subtle" : "medium",
  };
}

export function inferScrollMotion(
  values: ThemeEditorFormValues,
): ScrollMotionOption {
  if (!values.animationEnabled || values.animationIntensity === "none") {
    return "off";
  }
  if (values.animationIntensity === "subtle") return "gentle";
  return "smooth";
}

export function applyScrollMotion(
  option: ScrollMotionOption,
): Pick<ThemeEditorFormValues, "animationEnabled" | "animationIntensity"> {
  if (option === "off") {
    return { animationEnabled: false, animationIntensity: "none" };
  }
  return {
    animationEnabled: true,
    animationIntensity: option === "gentle" ? "subtle" : "medium",
  };
}
