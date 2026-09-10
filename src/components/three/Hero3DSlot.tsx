"use client";

import type { ComponentProps } from "react";
import { Hero3DBackdrop } from "@/components/three/Hero3DBackdrop";

type Props = ComponentProps<typeof Hero3DBackdrop>;

/**
 * Client boundary for the hero decorative backdrop.
 * Uses CSS-only atmosphere (no R3F canvas) to avoid React 19 getSnapshot loops.
 */
export function Hero3DSlot(props: Props) {
  if (!props.enabled) return props.fallback ?? null;
  return <Hero3DBackdrop {...props} />;
}
