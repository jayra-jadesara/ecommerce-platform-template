"use client";

import { useSyncExternalStore } from "react";

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Client hook for prefers-reduced-motion. SSR/default assumes reduced until hydrated. */
export function usePrefersReducedMotion(respectSetting = true): boolean {
  const prefers = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => true,
  );
  if (!respectSetting) return false;
  return prefers;
}

function subscribeMobile(breakpointPx: number) {
  return (onStoreChange: () => void) => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    mq.addEventListener("change", onStoreChange);
    return () => mq.removeEventListener("change", onStoreChange);
  };
}

export function useIsMobileViewport(breakpointPx = 768): boolean {
  return useSyncExternalStore(
    subscribeMobile(breakpointPx),
    () => window.matchMedia(`(max-width: ${breakpointPx - 1}px)`).matches,
    () => false,
  );
}

function getWebGLSnapshot(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

/** Detect WebGL availability without setState-in-effect. */
export function useHasWebGL(): boolean {
  return useSyncExternalStore(
    () => () => {},
    getWebGLSnapshot,
    () => false,
  );
}

/** Read theme color CSS variables for Three materials. */
export function readThemeColors(): {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
} {
  if (typeof document === "undefined") {
    return {
      primary: "#2563eb",
      secondary: "#64748b",
      accent: "#0d9488",
      background: "#ffffff",
    };
  }
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const value = styles.getPropertyValue(name).trim();
    return value || fallback;
  };
  return {
    primary: read("--color-primary", "#2563eb"),
    secondary: read("--color-secondary", "#64748b"),
    accent: read("--color-accent", "#0d9488"),
    background: read("--color-background", "#ffffff"),
  };
}
