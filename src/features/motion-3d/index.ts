/**
 * Phase 25 — centralized Motion & 3D configuration.
 *
 * Precedence (deterministic):
 * 1. Accessibility / prefers-reduced-motion
 * 2. Global platform safety (mobile 3D off, quality ceiling)
 * 3. Section override (only when source = "custom")
 * 4. Global Motion & 3D setting
 * 5. Component fallback
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

/** Safe CSS custom properties derived from motion config (theme tokens only). */
export function motionDesignTokens(effective: EffectiveMotionConfig): Record<
  string,
  string
> {
  if (!effective.shouldAnimate) {
    return {
      "--motion-duration": "0ms",
      "--motion-hover-lift": "0px",
      "--motion-ease": "linear",
    };
  }
  const duration =
    effective.intensity === "subtle"
      ? "280ms"
      : effective.intensity === "strong"
        ? "520ms"
        : "400ms";
  const lift =
    effective.hoverInteractions === "off"
      ? "0px"
      : effective.hoverInteractions === "smooth"
        ? "4px"
        : "2px";
  return {
    "--motion-duration": duration,
    "--motion-hover-lift": lift,
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

/** Build a section motion override from CMS config fields. */
export function sectionMotionOverrideFromConfig(config: {
  motionSource?: string | null;
  animationEnabled?: boolean | null;
  animationPreset?: string | null;
  animationIntensity?: string | null;
}): SectionMotionOverride {
  const source: MotionSource =
    config.motionSource === "custom" ? "custom" : "global";
  const preset =
    typeof config.animationPreset === "string"
      ? (config.animationPreset as AnimationPreset)
      : undefined;
  const intensity =
    config.animationIntensity === "subtle" ||
    config.animationIntensity === "smooth"
      ? config.animationIntensity
      : undefined;
  return {
    source,
    enabled: config.animationEnabled ?? undefined,
    preset,
    intensity,
  };
}

/** Build a section 3D override from CMS config fields. */
export function section3dOverrideFromConfig(config: {
  threeSource?: string | null;
  enable3d?: boolean | null;
  scene3dPreset?: string | null;
}): Section3dOverride {
  const source: MotionSource =
    config.threeSource === "custom" ? "custom" : "global";
  return {
    source,
    enabled: config.enable3d ?? undefined,
    preset: config.scene3dPreset
      ? resolveHeroPreset(config.scene3dPreset)
      : undefined,
  };
}

/** Recommended defaults for a fresh store. */
export const RECOMMENDED_MOTION_3D = {
  motionStyle: "MODERN" as MotionStylePreset,
  threeStyle: "NONE" as ThreeStylePreset,
  respectReducedMotion: true,
};
