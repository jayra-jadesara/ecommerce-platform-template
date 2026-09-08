"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const Hero3DBackdrop = dynamic(
  () =>
    import("@/components/three/Hero3DBackdrop").then((m) => m.Hero3DBackdrop),
  { ssr: false },
);

type Props = ComponentProps<typeof Hero3DBackdrop>;

/**
 * Client boundary that code-splits the hero 3D shell.
 * Ordinary pages that never enable hero 3D still avoid loading this chunk
 * until the slot mounts with `enabled`.
 */
export function Hero3DSlot(props: Props) {
  if (!props.enabled) return props.fallback ?? null;
  return <Hero3DBackdrop {...props} />;
}
