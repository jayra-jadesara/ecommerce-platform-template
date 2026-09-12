/**
 * Phase 25 — centralized Motion & 3D configuration.
 *
 * Precedence (deterministic):
 * 1. Accessibility / prefers-reduced-motion
 * 2. Global platform safety (mobile 3D off, quality ceiling)
 * 3. Global Motion & 3D setting (Appearance only — section CMS overrides ignored)
 * 4. Component fallback
 *
 * Business-facing presets map onto existing store_animation_settings +
 * store_visual_effects_settings. Database values are allow-listed only —
 * never JavaScript, shaders, or arbitrary CSS.
 */

import type {
  AnimationConfig,
  AnimationIntensity,
  AnimationPreset,
  VisualEffectsConfig,
  Visual3dQualityId,
  Visual3dPresetId,
} from "@/types";
import { resolveHeroPreset } from "@/features/visual-effects/schemas";

/** Store-wide motion style presets (admin-facing). */
export const MOTION_STYLE_PRESETS = [
  "NONE",
  "MINIMAL",
  "MODERN",
  "DYNAMIC",
] as const;
export type MotionStylePreset = (typeof MOTION_STYLE_PRESETS)[number];

/** Store-wide 3D style presets (admin-facing). */
export const THREE_STYLE_PRESETS = [
  "NONE",
  "SOFT",
  "PREMIUM",
  "IMMERSIVE",
] as const;
export type ThreeStylePreset = (typeof THREE_STYLE_PRESETS)[number];

export const MOTION_LEVELS = ["off", "subtle", "smooth"] as const;
export type MotionLevel = (typeof MOTION_LEVELS)[number];

export const MOBILE_3D_MODES = ["off", "lightweight", "full"] as const;
export type Mobile3dMode = (typeof MOBILE_3D_MODES)[number];

export const MOTION_STYLE_LABELS: Record<MotionStylePreset, string> = {
  NONE: "None — no decorative motion",
  MINIMAL: "Minimal — light fades only",
  MODERN: "Modern — smooth, polished motion",
  DYNAMIC: "Dynamic — stronger entrances & hover",
};

export const THREE_STYLE_LABELS: Record<ThreeStylePreset, string> = {
  NONE: "None — 3D off",
  SOFT: "Soft — gentle hero accents",
  PREMIUM: "Premium — hero + product when available",
  IMMERSIVE: "Immersive — fuller 3D (desktop)",
};

export type MotionSource = "global" | "custom";

export type SectionMotionOverride = {
  source: MotionSource;
  /** When source=custom */
  enabled?: boolean;
  preset?: AnimationPreset;
  intensity?: "subtle" | "smooth";
};

export type Section3dOverride = {
  source: MotionSource;
  enabled?: boolean;
  preset?: Visual3dPresetId;
};

export type EffectiveMotionConfig = {
  enabled: boolean;
  intensity: AnimationIntensity;
  defaultPreset: AnimationPreset;
  pageTransitions: MotionLevel;
  scrollReveal: MotionLevel;
  hoverInteractions: MotionLevel;
  respectReducedMotion: boolean;
  /** Resolved after reduced-motion / global disable. */
  shouldAnimate: boolean;
};

export type Effective3dConfig = {
  enabled: boolean;
  heroEnabled: boolean;
  productEnabled: boolean;
  decorativeEnabled: boolean;
  quality: Visual3dQualityId;
  heroPreset: Visual3dPresetId;
  mobileMode: Mobile3dMode;
  respectReducedMotion: boolean;
  /** May mount any 3D at all on this device. */
  mayMount3d: boolean;
  mayMountHero3d: boolean;
  mayMountProduct3d: boolean;
};

export type ResolveMotionInput = {
  global: AnimationConfig;
  section?: SectionMotionOverride | null;
  reducedMotion: boolean;
};

export type Resolve3dInput = {
  global: VisualEffectsConfig;
  animationEnabled: boolean;
  section?: Section3dOverride | null;
  isMobile: boolean;
  reducedMotion: boolean;
  webglAvailable: boolean;
  hasTrustedModel?: boolean;
};

export type Motion3dGlobalConfig = {
  animation: AnimationConfig;
  visualEffects: VisualEffectsConfig;
};

/** Read the store-wide Motion & 3D pair from platform config. */
export function getMotion3DConfig(input: Motion3dGlobalConfig): Motion3dGlobalConfig {
  return {
    animation: input.animation,
    visualEffects: input.visualEffects,
  };
}

/** Card hover mode inferred from store animation (mirrors admin studio). */
export type StorefrontCardMotion =
  | "clean"
  | "lift"
  | "zoom"
  | "float"
  | "glow";

/** Product image hover mode inferred from store animation (mirrors admin studio). */
export type StorefrontImageMotion =
  | "none"
  | "gentle-zoom"
  | "lift"
  | "float";

/** Button hover mode inferred from store animation (mirrors admin studio). */
export type StorefrontButtonHover = "none" | "lift" | "glow" | "scale";

export function inferCardMotionFromConfig(
  animation: Pick<AnimationConfig, "enabled" | "intensity" | "defaultPreset">,
): StorefrontCardMotion {
  if (!animation.enabled || animation.defaultPreset === "none") return "clean";
  if (animation.intensity === "strong") return "zoom";
  if (animation.intensity === "subtle") return "float";
  if (animation.defaultPreset === "fade") return "glow";
  return "lift";
}

export function inferImageMotionFromConfig(
  animation: Pick<AnimationConfig, "enabled" | "defaultPreset">,
): StorefrontImageMotion {
  if (!animation.enabled || animation.defaultPreset === "none") return "none";
  if (animation.defaultPreset === "scale") return "gentle-zoom";
  if (animation.defaultPreset === "slide-up") return "float";
  if (
    animation.defaultPreset === "fade-up" ||
    animation.defaultPreset === "fade-down"
  ) {
    return "lift";
  }
  return "gentle-zoom";
}

export function inferButtonHoverFromConfig(
  animation: Pick<AnimationConfig, "enabled" | "intensity" | "defaultPreset">,
): StorefrontButtonHover {
  if (!animation.enabled || animation.defaultPreset === "none") return "none";
  if (animation.intensity === "strong") return "scale";
  if (animation.intensity === "subtle") return "lift";
  return "glow";
}

/** HTML data-* attrs so storefront CSS can match admin Motion & 3D choices. */
export function motionHtmlDataAttributes(
  effective: EffectiveMotionConfig,
): Record<string, string> {
  if (!effective.shouldAnimate) {
    return {
      "data-card-motion": "clean",
      "data-image-motion": "none",
      "data-button-hover": "none",
      "data-store-motion": "off",
    };
  }
  const animation = {
    enabled: effective.enabled,
    intensity: effective.intensity,
    defaultPreset: effective.defaultPreset,
  };
  return {
    "data-card-motion": inferCardMotionFromConfig(animation),
    "data-image-motion": inferImageMotionFromConfig(animation),
    "data-button-hover": inferButtonHoverFromConfig(animation),
    "data-store-motion": "on",
  };
}

/** Safe CSS custom properties derived from motion config (theme tokens only). */
export function motionDesignTokens(effective: EffectiveMotionConfig): Record<
  string,
  string
> {
  const off = {
    "--motion-duration": "0ms",
    "--motion-hover-lift": "0px",
    "--motion-hover-scale": "1",
    "--motion-card-shadow": "none",
    "--motion-image-lift": "0px",
    "--motion-image-scale": "1",
    "--motion-image-rotate": "0deg",
    "--motion-float-distance": "0px",
    "--motion-btn-lift": "0px",
    "--motion-btn-scale": "1",
    "--motion-btn-shadow": "none",
    "--motion-ease": "linear",
  };

  if (!effective.shouldAnimate) return off;

  const animation = {
    enabled: effective.enabled,
    intensity: effective.intensity,
    defaultPreset: effective.defaultPreset,
  };
  const cardMotion = inferCardMotionFromConfig(animation);
  const imageMotion = inferImageMotionFromConfig(animation);
  const buttonHover = inferButtonHoverFromConfig(animation);

  const duration =
    effective.intensity === "subtle"
      ? "320ms"
      : effective.intensity === "strong"
        ? "480ms"
        : "380ms";

  let hoverLift = "0px";
  let hoverScale = "1";
  let cardShadow =
    "0 12px 28px color-mix(in srgb, var(--color-foreground) 10%, transparent)";
  let floatDistance = "0px";

  switch (cardMotion) {
    case "clean":
      hoverLift = "0px";
      hoverScale = "1";
      cardShadow = "none";
      break;
    case "lift":
      hoverLift = effective.intensity === "strong" ? "10px" : "8px";
      hoverScale = "1";
      cardShadow =
        "0 16px 36px color-mix(in srgb, var(--color-foreground) 14%, transparent)";
      break;
    case "zoom":
      hoverLift = "4px";
      hoverScale = effective.intensity === "strong" ? "1.04" : "1.03";
      cardShadow =
        "0 14px 32px color-mix(in srgb, var(--color-foreground) 12%, transparent)";
      break;
    case "float":
      hoverLift = "6px";
      hoverScale = "1";
      floatDistance = "5px";
      cardShadow =
        "0 14px 30px color-mix(in srgb, var(--color-primary) 16%, transparent)";
      break;
    case "glow":
      hoverLift = "3px";
      hoverScale = "1";
      cardShadow =
        "0 0 0 2px color-mix(in srgb, var(--color-primary) 28%, transparent), 0 14px 32px color-mix(in srgb, var(--color-primary) 18%, transparent)";
      break;
  }

  if (effective.hoverInteractions === "off") {
    hoverLift = "0px";
    hoverScale = "1";
    floatDistance = "0px";
  }

  let imageLift = "0px";
  let imageScale = "1";
  let imageRotate = "0deg";
  switch (imageMotion) {
    case "none":
      break;
    case "gentle-zoom":
      imageScale = effective.intensity === "strong" ? "1.1" : "1.08";
      imageRotate = "-4deg";
      break;
    case "lift":
      imageLift = "-8px";
      imageRotate = "-6deg";
      break;
    case "float":
      imageLift = "-4px";
      imageRotate = "-8deg";
      floatDistance =
        floatDistance === "0px" ? "4px" : floatDistance;
      break;
  }

  let btnLift = "0px";
  let btnScale = "1";
  let btnShadow = "none";
  switch (buttonHover) {
    case "lift":
      btnLift = "3px";
      btnShadow =
        "0 8px 18px color-mix(in srgb, var(--color-foreground) 14%, transparent)";
      break;
    case "scale":
      btnScale = "1.05";
      break;
    case "glow":
      btnShadow =
        "0 0 0 3px color-mix(in srgb, var(--color-primary) 26%, transparent)";
      break;
    default:
      break;
  }

  return {
    "--motion-duration": duration,
    "--motion-hover-lift": hoverLift,
    "--motion-hover-scale": hoverScale,
    "--motion-card-shadow": cardShadow,
    "--motion-image-lift": imageLift,
    "--motion-image-scale": imageScale,
    "--motion-image-rotate": imageRotate,
    "--motion-float-distance": floatDistance,
    "--motion-btn-lift": btnLift,
    "--motion-btn-scale": btnScale,
    "--motion-btn-shadow": btnShadow,
    "--motion-ease": "cubic-bezier(0.22, 1, 0.36, 1)",
  };
}

/** Apply a motion style preset → underlying AnimationConfig fields. */
export function applyMotionStylePreset(
  style: MotionStylePreset,
): Pick<AnimationConfig, "enabled" | "intensity" | "defaultPreset"> & {
  pageTransitions: MotionLevel;
  scrollReveal: MotionLevel;
  hoverInteractions: MotionLevel;
} {
  switch (style) {
    case "NONE":
      return {
        enabled: false,
        intensity: "medium",
        defaultPreset: "none",
        pageTransitions: "off",
        scrollReveal: "off",
        hoverInteractions: "off",
      };
    case "MINIMAL":
      return {
        enabled: true,
        intensity: "subtle",
        defaultPreset: "fade",
        pageTransitions: "off",
        scrollReveal: "subtle",
        hoverInteractions: "subtle",
      };
    case "DYNAMIC":
      return {
        enabled: true,
        intensity: "strong",
        defaultPreset: "fade-up",
        pageTransitions: "smooth",
        scrollReveal: "smooth",
        hoverInteractions: "smooth",
      };
    case "MODERN":
    default:
      return {
        enabled: true,
        intensity: "medium",
        defaultPreset: "fade-up",
        pageTransitions: "subtle",
        scrollReveal: "smooth",
        hoverInteractions: "subtle",
      };
  }
}

/** Infer motion style from stored AnimationConfig (compat). */
export function inferMotionStyle(animation: AnimationConfig): MotionStylePreset {
  if (!animation.enabled || animation.defaultPreset === "none") return "NONE";
  if (animation.intensity === "subtle") return "MINIMAL";
  if (animation.intensity === "strong") return "DYNAMIC";
  return "MODERN";
}

/** Apply a 3D style preset → underlying VisualEffectsConfig fields. */
export function applyThreeStylePreset(
  style: ThreeStylePreset,
): Pick<
  VisualEffectsConfig,
  | "enabled"
  | "heroEnabled"
  | "productEnabled"
  | "quality"
  | "heroPreset"
  | "mobileEnabled"
> {
  switch (style) {
    case "SOFT":
      return {
        enabled: true,
        heroEnabled: true,
        productEnabled: false,
        quality: "LOW",
        heroPreset: "SOFT_GEOMETRY",
        mobileEnabled: false,
      };
    case "PREMIUM":
      return {
        enabled: true,
        heroEnabled: true,
        productEnabled: true,
        quality: "MEDIUM",
        heroPreset: "FLOATING_SHAPES",
        mobileEnabled: false,
      };
    case "IMMERSIVE":
      return {
        enabled: true,
        heroEnabled: true,
        productEnabled: true,
        quality: "HIGH",
        heroPreset: "ABSTRACT_PARTICLES",
        mobileEnabled: false,
      };
    case "NONE":
    default:
      return {
        enabled: false,
        heroEnabled: false,
        productEnabled: false,
        quality: "MEDIUM",
        heroPreset: "NONE",
        mobileEnabled: false,
      };
  }
}

export function inferThreeStyle(ve: VisualEffectsConfig): ThreeStylePreset {
  if (!ve.enabled) return "NONE";
  if (ve.productEnabled && ve.quality === "HIGH") return "IMMERSIVE";
  if (ve.productEnabled) return "PREMIUM";
  if (ve.heroEnabled) return "SOFT";
  return "NONE";
}

export function isValidMotionStylePreset(
  value: unknown,
): value is MotionStylePreset {
  return (
    typeof value === "string" &&
    (MOTION_STYLE_PRESETS as readonly string[]).includes(value)
  );
}

export function isValidThreeStylePreset(
  value: unknown,
): value is ThreeStylePreset {
  return (
    typeof value === "string" &&
    (THREE_STYLE_PRESETS as readonly string[]).includes(value)
  );
}

function rankIntensity(value: AnimationIntensity): number {
  if (value === "subtle") return 0;
  if (value === "medium") return 1;
  return 2;
}

function clampIntensity(
  requested: AnimationIntensity,
  ceiling: AnimationIntensity,
): AnimationIntensity {
  return rankIntensity(requested) <= rankIntensity(ceiling)
    ? requested
    : ceiling;
}

export function resolveMotionConfig(
  input: ResolveMotionInput,
): EffectiveMotionConfig {
  const g = input.global;
  const style = inferMotionStyle(g);
  const derived = applyMotionStylePreset(style);

  let enabled = g.enabled;
  let intensity = g.intensity;
  let defaultPreset = g.defaultPreset;

  const section = input.section;
  if (section && section.source === "custom") {
    if (section.enabled === false) {
      enabled = false;
    } else if (section.enabled === true) {
      // Cannot turn motion on when the store-wide switch is off.
      enabled = g.enabled;
    }
    if (section.preset && enabled) {
      defaultPreset = section.preset;
    }
    if (section.intensity && enabled) {
      const mapped: AnimationIntensity =
        section.intensity === "smooth"
          ? g.intensity === "strong"
            ? "strong"
            : "medium"
          : "subtle";
      intensity = clampIntensity(mapped, g.intensity);
    }
  }

  // Accessibility always wins — never override prefers-reduced-motion.
  const respectReducedMotion = true;
  const shouldAnimate =
    enabled &&
    defaultPreset !== "none" &&
    !(input.reducedMotion && respectReducedMotion);

  return {
    enabled,
    intensity,
    defaultPreset: shouldAnimate ? defaultPreset : "none",
    pageTransitions: shouldAnimate ? derived.pageTransitions : "off",
    scrollReveal: shouldAnimate ? derived.scrollReveal : "off",
    hoverInteractions: shouldAnimate ? derived.hoverInteractions : "off",
    respectReducedMotion,
    shouldAnimate,
  };
}

const QUALITY_RANK: Record<Visual3dQualityId, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

function clampQuality(
  requested: Visual3dQualityId,
  ceiling: Visual3dQualityId,
): Visual3dQualityId {
  return QUALITY_RANK[requested] <= QUALITY_RANK[ceiling]
    ? requested
    : ceiling;
}

export function resolve3DConfig(input: Resolve3dInput): Effective3dConfig {
  const g = input.global;
  const mobileMode: Mobile3dMode = g.mobileEnabled ? "lightweight" : "off";

  let enabled = Boolean(g.enabled && input.animationEnabled);
  let heroEnabled = g.heroEnabled;
  const productEnabled = g.productEnabled;
  let heroPreset: Visual3dPresetId = resolveHeroPreset(g.heroPreset);
  let quality = g.quality;

  const section = input.section;
  if (section && section.source === "custom") {
    if (section.enabled === false) {
      heroEnabled = false;
    } else if (section.enabled === true) {
      // Section cannot exceed global: only enable if global allows hero 3D.
      heroEnabled = Boolean(g.enabled && g.heroEnabled);
    }
    if (section.preset) {
      const resolved = resolveHeroPreset(section.preset);
      if (resolved !== "NONE" && heroEnabled) {
        heroPreset = resolved;
      } else if (resolved === "NONE") {
        heroPreset = "NONE";
      }
    }
  }

  // Hard safety: reduced motion
  if (g.respectReducedMotion && input.reducedMotion) {
    enabled = false;
  }

  // Hard safety: mobile 3D off is non-overridable
  if (input.isMobile && mobileMode === "off") {
    enabled = false;
  }

  if (!input.webglAvailable) {
    enabled = false;
  }

  // Global quality is an upper bound (section cannot request higher).
  quality = clampQuality(quality, g.quality);

  const mayMount3d = Boolean(enabled && g.enabled);
  const mayMountHero3d = Boolean(
    mayMount3d && heroEnabled && heroPreset !== "NONE",
  );
  const mayMountProduct3d = Boolean(
    mayMount3d &&
      productEnabled &&
      (input.hasTrustedModel ?? true) &&
      (!input.isMobile || mobileMode !== "off"),
  );

  return {
    enabled: mayMount3d,
    heroEnabled,
    productEnabled,
    decorativeEnabled: mayMountHero3d,
    quality,
    heroPreset: mayMountHero3d ? heroPreset : "NONE",
    mobileMode,
    respectReducedMotion: g.respectReducedMotion,
    mayMount3d,
    mayMountHero3d,
    mayMountProduct3d,
  };
}

/** Build a section motion override from CMS config fields.
 * Motion is store-wide (Appearance → Motion & 3D); section custom is ignored.
 */
export function sectionMotionOverrideFromConfig(_config: {
  motionSource?: string | null;
  animationEnabled?: boolean | null;
  animationPreset?: string | null;
  animationIntensity?: string | null;
}): SectionMotionOverride {
  return { source: "global" };
}

/** Build a section 3D override from CMS config fields.
 * 3D is store-wide (Appearance → Motion & 3D); section custom is ignored.
 */
export function section3dOverrideFromConfig(_config: {
  threeSource?: string | null;
  enable3d?: boolean | null;
  scene3dPreset?: string | null;
}): Section3dOverride {
  return { source: "global" };
}

/** Recommended defaults for a fresh store. */
export const RECOMMENDED_MOTION_3D = {
  motionStyle: "MODERN" as MotionStylePreset,
  threeStyle: "NONE" as ThreeStylePreset,
  respectReducedMotion: true,
};
