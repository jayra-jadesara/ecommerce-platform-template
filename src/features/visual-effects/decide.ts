import type { VisualEffectsConfig } from "@/features/visual-effects/schemas";
import {
  resolveHeroPreset,
  type Visual3dPreset,
} from "@/features/visual-effects/schemas";

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
 * Used by components and unit tests — never trusts client flags alone for auth.
 */
export function shouldMountDecorative3d(input: ThreeGateInput): boolean {
  const { visualEffects: v } = input;
  if (!v.enabled) return false;
  if (!input.featureEnabled) return false;
  if (!input.webglAvailable) return false;
  if (input.isMobile && !v.mobileEnabled) return false;
  if (v.respectReducedMotion && input.prefersReducedMotion) return false;
  if (!input.animationEnabled) return false;
  if (input.preset != null) {
    const preset = resolveHeroPreset(input.preset);
    if (preset === "NONE") return false;
  }
  return true;
}

export function shouldMountHero3d(input: Omit<ThreeGateInput, "featureEnabled"> & {
  section3dEnabled: boolean;
  sectionPreset?: string | null;
}): { mount: boolean; preset: Visual3dPreset } {
  const preset = resolveHeroPreset(
    input.sectionPreset && input.sectionPreset !== "NONE"
      ? input.sectionPreset
      : input.visualEffects.heroPreset,
  );
  const mount = shouldMountDecorative3d({
    ...input,
    featureEnabled: input.visualEffects.heroEnabled && input.section3dEnabled,
    preset,
  });
  return { mount, preset };
}

export function shouldMountProduct3d(
  input: Omit<ThreeGateInput, "featureEnabled" | "preset"> & {
    hasTrustedModel: boolean;
  },
): boolean {
  if (!input.hasTrustedModel) return false;
  return shouldMountDecorative3d({
    ...input,
    featureEnabled: input.visualEffects.productEnabled,
  });
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
