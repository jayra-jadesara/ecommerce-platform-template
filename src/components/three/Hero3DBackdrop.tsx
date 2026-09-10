"use client";

import { useEffect, useState } from "react";
import type { Visual3dQuality } from "@/features/visual-effects/schemas";
import { resolveHeroPreset } from "@/features/visual-effects/schemas";

type Hero3DProps = {
  preset: string;
  quality: Visual3dQuality;
  enabled: boolean;
  mobileEnabled: boolean;
  respectReducedMotion: boolean;
  animationStoreEnabled: boolean;
  rotationSpeed?: number;
  cameraDistance?: number;
  className?: string;
  fallback?: React.ReactNode;
};

function computeAllowMotion(input: {
  enabled: boolean;
  resolvedPreset: string;
  animationStoreEnabled: boolean;
  respectReducedMotion: boolean;
  mobileEnabled: boolean;
}): boolean {
  if (!input.enabled || input.resolvedPreset === "NONE" || !input.animationStoreEnabled) {
    return false;
  }
  if (typeof window === "undefined") return false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  if (input.respectReducedMotion && reduced) return false;
  if (mobile && !input.mobileEnabled) return false;
  return true;
}

/**
 * Decorative hero backdrop (CSS only).
 *
 * React Three Fiber was removed from this path: its internal
 * useSyncExternalStore was throwing getSnapshot / max-update-depth
 * loops under React 19 + Next on the storefront homepage.
 */
export function Hero3DBackdrop({
  preset,
  enabled,
  mobileEnabled,
  respectReducedMotion,
  animationStoreEnabled,
  className,
  fallback = null,
}: Hero3DProps) {
  const resolvedPreset = resolveHeroPreset(preset);
  const [allowMotion, setAllowMotion] = useState(false);

  useEffect(() => {
    const next = computeAllowMotion({
      enabled,
      resolvedPreset,
      animationStoreEnabled,
      respectReducedMotion,
      mobileEnabled,
    });
    setAllowMotion((prev) => (prev === next ? prev : next));
  }, [
    enabled,
    resolvedPreset,
    animationStoreEnabled,
    respectReducedMotion,
    mobileEnabled,
  ]);

  if (!enabled || resolvedPreset === "NONE") {
    return <>{fallback}</>;
  }

  return (
    <div className={className} aria-hidden>
      <div
        className={
          allowMotion
            ? "hero-3d-css-backdrop hero-3d-css-backdrop--motion absolute inset-0"
            : "hero-3d-css-backdrop absolute inset-0"
        }
      />
      {fallback}
    </div>
  );
}
