"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { getAnimationVariants } from "@/features/animation/presets";
import type { AnimationConfig, AnimationPreset } from "@/types";

interface MotionProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  preset?: AnimationPreset;
  animation?: AnimationConfig;
  as?: "div" | "section" | "article" | "header" | "footer";
}

/**
 * Config-driven motion wrapper using only safe presets.
 */
export function Motion({
  children,
  preset,
  animation,
  as = "div",
  className,
  ...rest
}: MotionProps) {
  const enabled = animation?.enabled ?? true;
  const intensity = animation?.intensity ?? "medium";
  const resolvedPreset = preset ?? animation?.defaultPreset ?? "fade-up";

  if (!enabled || resolvedPreset === "none") {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const variants = getAnimationVariants(resolvedPreset, intensity);
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={variants}
      {...rest}
    >
      {children}
    </Component>
  );
}
