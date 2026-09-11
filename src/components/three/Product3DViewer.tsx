"use client";

import dynamic from "next/dynamic";
import { Suspense, useMemo } from "react";
import { ThreeErrorBoundary } from "@/components/three/ThreeErrorBoundary";
import {
  isSafeModelStoragePath,
  type Visual3dQuality,
  qualityRenderHints,
} from "@/features/visual-effects/schemas";
import {
  useHasWebGL,
  useIsMobileViewport,
  usePrefersReducedMotion,
} from "@/features/visual-effects/hooks";
import { LoadingState } from "@/components/ui/LoadingState";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";

const SceneWrapper = dynamic(
  () =>
    import("@/components/three/SceneWrapper").then((m) => m.SceneWrapper),
  { ssr: false, loading: () => <LoadingState label="Loading 3D…" /> },
);

const ModelScene = dynamic(
  () =>
    import("@/components/three/presets/ModelScene").then((m) => m.ModelScene),
  { ssr: false },
);

type Product3DViewerProps = {
  modelPath: string | null | undefined;
  enabled: boolean;
  mobileEnabled: boolean;
  respectReducedMotion: boolean;
  animationStoreEnabled: boolean;
  quality: Visual3dQuality;
  /** 2D gallery / image fallback (required for accessibility). */
  fallback: React.ReactNode;
  className?: string;
};

/**
 * Optional product 3D presentation.
 * Without a trusted model path, shows the 2D gallery fallback.
 * Never invents geometry from product photos.
 */
export function Product3DViewer({
  modelPath,
  enabled,
  mobileEnabled,
  respectReducedMotion,
  animationStoreEnabled,
  quality,
  fallback,
  className,
}: Product3DViewerProps) {
  const reducedMotion = usePrefersReducedMotion(respectReducedMotion);
  const isMobile = useIsMobileViewport();
  const webgl = useHasWebGL();

  const safePath = isSafeModelStoragePath(modelPath) ? modelPath!.trim() : null;
  /** Public products bucket only — never arbitrary remote URLs. */
  const modelUrl = safePath
    ? resolvePublicStorageUrl("products", safePath)
    : undefined;

  const shouldRender = useMemo(() => {
    if (!enabled) return false;
    if (!modelUrl) return false;
    if (!webgl) return false;
    if (isMobile && !mobileEnabled) return false;
    if (respectReducedMotion && reducedMotion) return false;
    if (!animationStoreEnabled) return false;
    return true;
  }, [
    enabled,
    modelUrl,
    webgl,
    isMobile,
    mobileEnabled,
    respectReducedMotion,
    reducedMotion,
    animationStoreEnabled,
  ]);

  if (!shouldRender) {
    return (
      <div
        className={className}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "28rem",
          aspectRatio: "1 / 1",
          overflow: "hidden",
        }}
      >
        {fallback}
      </div>
    );
  }

  const hints = qualityRenderHints(quality);

  return (
    <ThreeErrorBoundary fallback={fallback}>
      <div
        className={className}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "28rem",
          aspectRatio: "1 / 1",
          overflow: "hidden",
        }}
      >
        <Suspense fallback={fallback}>
          <SceneWrapper
            className="h-full w-full"
            aria-label="Product 3D preview"
            dpr={[1, hints.dprMax]}
            camera={{ position: [0, 0.15, 3.2], fov: 42 }}
            gl={{ antialias: quality !== "LOW", alpha: true }}
          >
            <ModelScene url={modelUrl!} reducedMotion={reducedMotion} />
          </SceneWrapper>
        </Suspense>
      </div>
    </ThreeErrorBoundary>
  );
}
