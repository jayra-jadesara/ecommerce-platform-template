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
import { applyColorTokens } from "@/features/theme/css-vars";
import { createAppMuiTheme } from "@/features/theme/create-mui-theme";
import {
  canUserToggleTheme,
  getAvailableThemeModes,
  nextThemeMode,
  sanitizeStoredMode,
} from "@/features/theme/modes";
import type {
  PlatformConfig,
  ResolvedThemeMode,
  ThemeMode,
} from "@/types";

const STORAGE_KEY = "platform-theme-mode";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  availableModes: ThemeMode[];
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

function readRawStoredMode(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
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
  const availableModes = useMemo(
    () => getAvailableThemeModes(themeConfig),
    [themeConfig],
  );
  const allowUserToggle = canUserToggleTheme(themeConfig);

  const mode = useSyncExternalStore(
    subscribeMode,
    () => sanitizeStoredMode(readRawStoredMode(), themeConfig),
    () => themeConfig.defaultMode,
  );

  const systemMode = useSyncExternalStore(
    subscribeSystem,
    getSystemSnapshot,
    (): ResolvedThemeMode => "light",
  );

  const resolvedMode: ResolvedThemeMode = useMemo(() => {
    if (mode === "system") {
      if (!availableModes.includes("system")) {
        return themeConfig.defaultMode === "dark" ? "dark" : "light";
      }
      const preferred = systemMode;
      if (preferred === "dark" && availableModes.includes("dark")) return "dark";
      if (preferred === "light" && availableModes.includes("light")) return "light";
      if (availableModes.includes("light")) return "light";
      if (availableModes.includes("dark")) return "dark";
      return "light";
    }
    if (!availableModes.includes(mode)) {
      return themeConfig.defaultMode === "dark" ? "dark" : "light";
    }
    return mode;
  }, [mode, systemMode, availableModes, themeConfig.defaultMode]);

  useEffect(() => {
    const tokens =
      resolvedMode === "dark" ? themeConfig.dark : themeConfig.light;
    applyColorTokens(tokens);
    document.documentElement.classList.toggle("dark", resolvedMode === "dark");
    document.documentElement.style.colorScheme = resolvedMode;
    if (themeConfig.borderRadius) {
      document.documentElement.style.setProperty(
        "--radius-default",
        themeConfig.borderRadius,
      );
    }
  }, [resolvedMode, themeConfig]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      if (!allowUserToggle) return;
      if (!availableModes.includes(next)) return;
      writeStoredMode(next);
    },
    [allowUserToggle, availableModes],
  );

  const cycleMode = useCallback(() => {
    if (!allowUserToggle) return;
    setMode(nextThemeMode(mode, themeConfig));
  }, [allowUserToggle, mode, setMode, themeConfig]);

  const muiTheme = useMemo(() => {
    const tokens =
      resolvedMode === "dark" ? themeConfig.dark : themeConfig.light;
    return createAppMuiTheme(
      tokens,
      typography,
      resolvedMode,
      themeConfig.borderRadius,
    );
  }, [resolvedMode, themeConfig, typography]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      availableModes,
      allowUserToggle,
      setMode,
      cycleMode,
    }),
    [mode, resolvedMode, availableModes, allowUserToggle, setMode, cycleMode],
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
