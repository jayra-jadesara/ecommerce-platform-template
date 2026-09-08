"use client";

import dynamic from "next/dynamic";
import { Suspense, useMemo, useSyncExternalStore } from "react";
import { ThreeErrorBoundary } from "@/components/three/ThreeErrorBoundary";
import type { Visual3dQuality } from "@/features/visual-effects/schemas";
import { qualityRenderHints, resolveHeroPreset } from "@/features/visual-effects/schemas";
import {
  readThemeColors,
  useHasWebGL,
  useIsMobileViewport,
  usePrefersReducedMotion,
} from "@/features/visual-effects/hooks";
import { LoadingState } from "@/components/ui/LoadingState";

const SceneWrapper = dynamic(
  () =>
    import("@/components/three/SceneWrapper").then((m) => m.SceneWrapper),
  { ssr: false, loading: () => <LoadingState label="Loading visuals…" /> },
);

const PresetScene = dynamic(
  () =>
    import("@/components/three/presets/PresetScene").then((m) => m.PresetScene),
  { ssr: false },
);

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
  /** Accessible description; canvas is decorative. */
  fallback?: React.ReactNode;
};

/**
 * Decorative hero 3D layer. Important copy must remain in HTML siblings.
 */
export function Hero3DBackdrop({
  preset,
  quality,
  enabled,
  mobileEnabled,
  respectReducedMotion,
  animationStoreEnabled,
  rotationSpeed = 0.25,
  cameraDistance = 4.5,
  className,
  fallback = null,
}: Hero3DProps) {
  const resolvedPreset = resolveHeroPreset(preset);
  const reducedMotion = usePrefersReducedMotion(respectReducedMotion);
  const isMobile = useIsMobileViewport();
  const webgl = useHasWebGL();
  const colors = useSyncExternalStore(
    () => () => {},
    readThemeColors,
    () => readThemeColors(),
  );

  const shouldRender = useMemo(() => {
    if (!enabled) return false;
    if (resolvedPreset === "NONE") return false;
    if (!webgl) return false;
    if (isMobile && !mobileEnabled) return false;
    if (respectReducedMotion && reducedMotion) return false;
    if (!animationStoreEnabled) return false;
    return true;
  }, [
    enabled,
    resolvedPreset,
    webgl,
    isMobile,
    mobileEnabled,
    respectReducedMotion,
    reducedMotion,
    animationStoreEnabled,
  ]);

  if (!shouldRender) {
    return <>{fallback}</>;
  }

  const hints = qualityRenderHints(quality);

  return (
    <ThreeErrorBoundary fallback={fallback}>
      <div className={className} aria-hidden>
        <Suspense fallback={<LoadingState label="Loading visuals…" />}>
          <SceneWrapper
            className="h-full w-full"
            aria-label="Decorative 3D background"
            dpr={[1, hints.dprMax]}
            camera={{ position: [0, 0.2, cameraDistance], fov: 45 }}
            gl={{ antialias: quality !== "LOW", alpha: true, powerPreference: "default" }}
          >
            <PresetScene
              preset={resolvedPreset}
              quality={quality}
              colors={colors}
              reducedMotion={reducedMotion || !animationStoreEnabled}
              rotationSpeed={rotationSpeed}
            />
          </SceneWrapper>
        </Suspense>
      </div>
    </ThreeErrorBoundary>
  );
}
