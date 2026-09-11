import type { VisualEffectsConfig } from "@/features/visual-effects/schemas";
import {
  resolveHeroPreset,
  type Visual3dPreset,
} from "@/features/visual-effects/schemas";
import { resolve3DConfig } from "@/features/motion-3d";

export type ThreeGateInput = {
  visualEffects: VisualEffectsConfig;
  /** Store animation master switch — 3D motion respects it. */
  animationEnabled: boolean;
  /** Section/product-level opt-in. */
  featureEnabled: boolean;
  isMobile: boolean;
  prefersReducedMotion: boolean;
  webglAvailable: boolean;
  /** For hero: preset after allow-list resolve. */
  preset?: string | null;
};

/**
 * Pure gate for whether decorative/product 3D may mount.
 * Delegates to the central Motion & 3D resolver (Phase 25).
 */
export function shouldMountDecorative3d(input: ThreeGateInput): boolean {
  const resolved = resolve3DConfig({
    global: input.visualEffects,
    animationEnabled: input.animationEnabled,
    section: {
      source: "custom",
      enabled: input.featureEnabled,
      preset: input.preset ? resolveHeroPreset(input.preset) : undefined,
    },
    isMobile: input.isMobile,
    reducedMotion: input.prefersReducedMotion,
    webglAvailable: input.webglAvailable,
  });
  return resolved.mayMount3d && input.featureEnabled;
}

export function shouldMountHero3d(
  input: Omit<ThreeGateInput, "featureEnabled"> & {
    section3dEnabled: boolean;
    sectionPreset?: string | null;
    /** When "global", section flags are ignored and store defaults apply. */
    threeSource?: "global" | "custom";
  },
): { mount: boolean; preset: Visual3dPreset } {
  const source = input.threeSource ?? "custom";
  const resolved = resolve3DConfig({
    global: input.visualEffects,
    animationEnabled: input.animationEnabled,
    section: {
      source,
      enabled: input.section3dEnabled,
      preset: input.sectionPreset
        ? resolveHeroPreset(input.sectionPreset)
        : undefined,
    },
    isMobile: input.isMobile,
    reducedMotion: input.prefersReducedMotion,
    webglAvailable: input.webglAvailable,
  });
  return { mount: resolved.mayMountHero3d, preset: resolved.heroPreset };
}

export function shouldMountProduct3d(
  input: Omit<ThreeGateInput, "featureEnabled" | "preset"> & {
    hasTrustedModel: boolean;
  },
): boolean {
  const resolved = resolve3DConfig({
    global: input.visualEffects,
    animationEnabled: input.animationEnabled,
    isMobile: input.isMobile,
    reducedMotion: input.prefersReducedMotion,
    webglAvailable: input.webglAvailable,
    hasTrustedModel: input.hasTrustedModel,
  });
  return resolved.mayMountProduct3d;
}

/** Clamp hero numeric knobs from CMS (no arbitrary unbounded values). */
export function clampHeroRotationSpeed(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0.25;
  return Math.min(2, Math.max(0, n));
}

export function clampHeroCameraDistance(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 4.5;
  return Math.min(12, Math.max(2, n));
}
