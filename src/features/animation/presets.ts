import type { AnimationIntensity, AnimationPreset } from "@/types";
import type { Transition, Variants } from "framer-motion";

const INTENSITY_FACTOR: Record<AnimationIntensity, number> = {
  subtle: 0.6,
  medium: 1,
  strong: 1.4,
};

function transitionFor(intensity: AnimationIntensity): Transition {
  const f = INTENSITY_FACTOR[intensity];
  return {
    duration: 0.35 * f,
    ease: [0.22, 1, 0.36, 1],
  };
}

/**
 * Safe, predefined animation presets.
 * Admin may select among these — never execute arbitrary animation JS from the DB.
 */
export function getAnimationVariants(
  preset: AnimationPreset,
  intensity: AnimationIntensity = "medium",
): Variants {
  const f = INTENSITY_FACTOR[intensity];
  const t = transitionFor(intensity);

  switch (preset) {
    case "none":
      return { hidden: { opacity: 1 }, visible: { opacity: 1 } };
    case "fade":
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: t },
      };
    case "fade-up":
      return {
        hidden: { opacity: 0, y: 16 * f },
        visible: { opacity: 1, y: 0, transition: t },
      };
    case "fade-down":
      return {
        hidden: { opacity: 0, y: -16 * f },
        visible: { opacity: 1, y: 0, transition: t },
      };
    case "slide-up":
      return {
        hidden: { y: 24 * f, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: t },
      };
    case "slide-down":
      return {
        hidden: { y: -24 * f, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: t },
      };
    case "scale":
      return {
        hidden: { scale: 1 - 0.06 * f, opacity: 0 },
        visible: { scale: 1, opacity: 1, transition: t },
      };
    default:
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: t },
      };
  }
}

export const ANIMATION_PRESET_IDS: AnimationPreset[] = [
  "fade",
  "fade-up",
  "fade-down",
  "slide-up",
  "slide-down",
  "scale",
  "none",
];
