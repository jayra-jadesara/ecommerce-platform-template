"use client";

import { useSyncExternalStore } from "react";

/* ── prefers-reduced-motion (cached boolean snapshot) ── */

let reducedMotionSnapshot = false;

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    const next = mq.matches;
    if (next !== reducedMotionSnapshot) {
      reducedMotionSnapshot = next;
      onStoreChange();
    }
  };
  sync();
  mq.addEventListener("change", sync);
  return () => mq.removeEventListener("change", sync);
}

function getReducedMotionSnapshot() {
  return reducedMotionSnapshot;
}

function getReducedMotionServerSnapshot() {
  return true;
}

/** Client hook for prefers-reduced-motion. SSR assumes reduced until hydrated. */
export function usePrefersReducedMotion(respectSetting = true): boolean {
  const prefers = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  if (!respectSetting) return false;
  return prefers;
}

/* ── mobile viewport (cached boolean snapshot) ── */

let mobile768Snapshot = false;

function subscribeMobile768(onStoreChange: () => void) {
  const mq = window.matchMedia("(max-width: 767px)");
  const sync = () => {
    const next = mq.matches;
    if (next !== mobile768Snapshot) {
      mobile768Snapshot = next;
      onStoreChange();
    }
  };
  sync();
  mq.addEventListener("change", sync);
  return () => mq.removeEventListener("change", sync);
}

function getMobile768Snapshot() {
  return mobile768Snapshot;
}

function getMobile768ServerSnapshot() {
  return false;
}

/** Storefront mobile breakpoint (768px). */
export function useIsMobileViewport(_breakpointPx = 768): boolean {
  return useSyncExternalStore(
    subscribeMobile768,
    getMobile768Snapshot,
    getMobile768ServerSnapshot,
  );
}

/* ── WebGL (cached boolean; never recreate canvas in getSnapshot) ── */

let webglSnapshot = false;
let webglResolved = false;

function getWebGLSnapshot(): boolean {
  return webglSnapshot;
}

function getWebGLServerSnapshot() {
  return false;
}

function subscribeWebGL(onStoreChange: () => void) {
  if (!webglResolved) {
    webglResolved = true;
    try {
      const canvas = document.createElement("canvas");
      webglSnapshot = Boolean(
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
      );
    } catch {
      webglSnapshot = false;
    }
    onStoreChange();
  }
  return () => {};
}

/** Detect WebGL availability without setState-in-effect. */
export function useHasWebGL(): boolean {
  return useSyncExternalStore(
    subscribeWebGL,
    getWebGLSnapshot,
    getWebGLServerSnapshot,
  );
}

export type ThemeColorSnapshot = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
};

const FALLBACK_THEME_COLORS: ThemeColorSnapshot = {
  primary: "#2563eb",
  secondary: "#64748b",
  accent: "#0d9488",
  background: "#ffffff",
};

/** One-shot CSS variable read (never use as useSyncExternalStore getSnapshot). */
export function readThemeColors(): ThemeColorSnapshot {
  if (typeof document === "undefined") return FALLBACK_THEME_COLORS;
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    primary: read("--color-primary", FALLBACK_THEME_COLORS.primary),
    secondary: read("--color-secondary", FALLBACK_THEME_COLORS.secondary),
    accent: read("--color-accent", FALLBACK_THEME_COLORS.accent),
    background: read("--color-background", FALLBACK_THEME_COLORS.background),
  };
}
