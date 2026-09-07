"use client";

import { Canvas, type CanvasProps } from "@react-three/fiber";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CanvasContainerProps extends Omit<CanvasProps, "children"> {
  children: ReactNode;
  className?: string;
  /** Accessible label for the 3D canvas region. */
  "aria-label"?: string;
}

/**
 * Isolated R3F canvas. Import only via dynamic/lazy wrappers —
 * do not mount on every page.
 */
export function CanvasContainer({
  children,
  className,
  "aria-label": ariaLabel = "3D scene",
  ...canvasProps
}: CanvasContainerProps) {
  return (
    <div
      className={cn("relative h-full w-full", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        {...canvasProps}
      >
        {children}
      </Canvas>
    </div>
  );
}
