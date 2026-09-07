"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { applyColorTokens } from "@/features/theme/apply-css-vars";
import { createAppMuiTheme } from "@/features/theme/create-mui-theme";
import type {
  PlatformConfig,
  ResolvedThemeMode,
  ThemeMode,
} from "@/types";

const STORAGE_KEY = "platform-theme-mode";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  allowUserToggle: boolean;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const modeListeners = new Set<() => void>();

function subscribeMode(listener: () => void) {
  modeListeners.add(listener);
  return () => modeListeners.delete(listener);
}

function readStoredMode(fallback: ThemeMode): ThemeMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

function writeStoredMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  modeListeners.forEach((listener) => listener());
}

function subscribeSystem(listener: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}

function getSystemSnapshot(): ResolvedThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

interface PlatformThemeProviderProps {
  config: PlatformConfig;
  children: ReactNode;
}

export function PlatformThemeProvider({
  config,
  children,
}: PlatformThemeProviderProps) {
  const { theme: themeConfig, typography } = config;
  const defaultMode = themeConfig.defaultMode;

  const mode = useSyncExternalStore(
    subscribeMode,
    () => readStoredMode(defaultMode),
    () => defaultMode,
  );

  const systemMode = useSyncExternalStore(
    subscribeSystem,
    getSystemSnapshot,
    (): ResolvedThemeMode => "light",
  );

  const resolvedMode: ResolvedThemeMode =
    mode === "system" ? systemMode : mode;

  useEffect(() => {
    const tokens =
      resolvedMode === "dark" ? themeConfig.dark : themeConfig.light;
    applyColorTokens(tokens);
    document.documentElement.classList.toggle("dark", resolvedMode === "dark");
    document.documentElement.style.colorScheme = resolvedMode;
  }, [resolvedMode, themeConfig]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      if (!themeConfig.allowUserToggle && next !== themeConfig.defaultMode) {
        return;
      }
      writeStoredMode(next);
    },
    [themeConfig.allowUserToggle, themeConfig.defaultMode],
  );

  const cycleMode = useCallback(() => {
    const order: ThemeMode[] = ["light", "dark", "system"];
    const idx = order.indexOf(mode);
    setMode(order[(idx + 1) % order.length]);
  }, [mode, setMode]);

  const muiTheme = useMemo(() => {
    const tokens =
      resolvedMode === "dark" ? themeConfig.dark : themeConfig.light;
    return createAppMuiTheme(tokens, typography, resolvedMode);
  }, [resolvedMode, themeConfig, typography]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      allowUserToggle: themeConfig.allowUserToggle,
      setMode,
      cycleMode,
    }),
    [mode, resolvedMode, themeConfig.allowUserToggle, setMode, cycleMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within PlatformThemeProvider");
  }
  return ctx;
}
