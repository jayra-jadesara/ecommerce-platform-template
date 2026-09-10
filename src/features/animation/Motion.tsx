"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { getAnimationVariants } from "@/features/animation/presets";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import type { AnimationConfig, AnimationPreset } from "@/types";

interface MotionProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  preset?: AnimationPreset;
  animation?: AnimationConfig;
  as?: "div" | "section" | "article" | "header" | "footer";
}

/**
 * Config-driven motion wrapper using only safe presets.
 * Renders a plain element until hydrated to avoid Framer Motion SSR mismatches.
 */
export function Motion({
  children,
  preset,
  animation,
  as = "div",
  className,
  ...rest
}: MotionProps) {
  const hydrated = useHasHydrated();
  const enabled = animation?.enabled ?? true;
  const intensity = animation?.intensity ?? "medium";
  const resolvedPreset = preset ?? animation?.defaultPreset ?? "fade-up";
  const Tag = as;

  if (!hydrated || !enabled || resolvedPreset === "none") {
    return <Tag className={className}>{children}</Tag>;
  }

  const variants = getAnimationVariants(resolvedPreset, intensity);
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
