"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { getAnimationVariants } from "@/features/animation/presets";
import {
  resolveMotionConfig,
  type SectionMotionOverride,
} from "@/features/motion-3d";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import { usePrefersReducedMotion } from "@/features/visual-effects/hooks";
import type { AnimationConfig, AnimationPreset } from "@/types";

interface MotionProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  preset?: AnimationPreset;
  animation?: AnimationConfig;
  /** Optional CMS section override — defaults to store-wide settings. */
  sectionOverride?: SectionMotionOverride | null;
  as?: "div" | "section" | "article" | "header" | "footer";
}

/**
 * Config-driven motion wrapper using only safe presets.
 * Resolves effective motion through the central Motion & 3D system.
 * Renders a plain element until hydrated to avoid Framer Motion SSR mismatches.
 */
export function Motion({
  children,
  preset,
  animation,
  sectionOverride,
  as = "div",
  className,
  ...rest
}: MotionProps) {
  const hydrated = useHasHydrated();
  const prefersReducedMotion = usePrefersReducedMotion(true);
  /** Match ThemeProvider: don't treat SSR snapshot as real reduced-motion. */
  const reducedMotion = hydrated && prefersReducedMotion;

  const global: AnimationConfig = animation ?? {
    enabled: true,
    intensity: "medium",
    defaultPreset: "fade-up",
  };

  const section: SectionMotionOverride | null = sectionOverride
    ? sectionOverride
    : preset
      ? { source: "custom", enabled: true, preset }
      : null;

  const effective = resolveMotionConfig({
    global,
    section,
    reducedMotion,
  });

  const Tag = as;

  if (!hydrated || !effective.shouldAnimate) {
    return <Tag className={className}>{children}</Tag>;
  }

  const variants = getAnimationVariants(
    effective.defaultPreset,
    effective.intensity,
  );
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial="hidden"
      animate="visible"
      variants={variants}
      {...rest}
    >
      {children}
    </Component>
  );
}
