"use client";

import { createContext, useContext } from "react";
import type { ResolvedThemeMode, ThemeMode } from "@/types";

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  availableModes: ThemeMode[];
  allowUserToggle: boolean;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

/** Isolated module so HMR/webpack never duplicate the context identity. */
export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within PlatformThemeProvider");
  }
  return ctx;
}

/** Safe when chrome may render outside the provider (e.g. Fast Refresh). */
export function useThemeModeOptional(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
