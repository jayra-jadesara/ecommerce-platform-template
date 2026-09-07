"use client";

import dynamic from "next/dynamic";
import type { ComponentProps, ReactNode } from "react";
import { LoadingState } from "@/components/ui/LoadingState";

const CanvasContainer = dynamic(
  () =>
    import("@/components/three/CanvasContainer").then(
      (m) => m.CanvasContainer,
    ),
  {
    ssr: false,
    loading: () => <LoadingState label="Loading 3D…" />,
  },
);

interface SceneWrapperProps extends ComponentProps<typeof CanvasContainer> {
  children: ReactNode;
}

/**
 * Lazy-loaded Three.js entry. Keeps 3D deps out of the main bundle
 * until a premium section explicitly mounts this wrapper.
 */
export function SceneWrapper({ children, ...props }: SceneWrapperProps) {
  return <CanvasContainer {...props}>{children}</CanvasContainer>;
}
