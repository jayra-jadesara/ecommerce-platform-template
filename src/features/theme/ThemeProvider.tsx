"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { applyColorTokens, normalizeColorTokensForMode } from "@/features/theme/css-vars";
import { createAppMuiTheme } from "@/features/theme/create-mui-theme";
import {
  canUserToggleTheme,
  getAvailableThemeModes,
  nextThemeMode,
  sanitizeStoredMode,
} from "@/features/theme/modes";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import type {
  PlatformConfig,
  ResolvedThemeMode,
  ThemeConfig,
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

/** Latest theme config for getSnapshot — avoid closing over a new object each render. */
let latestThemeConfig: ThemeConfig | null = null;

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

function getModeSnapshot(): ThemeMode {
  const cfg = latestThemeConfig;
  if (!cfg) return "light";
  return sanitizeStoredMode(readRawStoredMode(), cfg);
}

function getModeServerSnapshot(): ThemeMode {
  return latestThemeConfig?.defaultMode ?? "light";
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

function getSystemServerSnapshot(): ResolvedThemeMode {
  const defaultMode = latestThemeConfig?.defaultMode ?? "light";
  return defaultMode === "dark" ? "dark" : "light";
}

/** Stable light/dark used for SSR + first client paint (never reads OS/localStorage). */
function ssrSafeResolvedMode(defaultMode: ThemeMode): ResolvedThemeMode {
  return defaultMode === "dark" ? "dark" : "light";
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
  latestThemeConfig = themeConfig;

  const availableModes = useMemo(
    () => getAvailableThemeModes(themeConfig),
    [themeConfig],
  );
  const allowUserToggle = canUserToggleTheme(themeConfig);

  /**
   * Emotion class hashes must match SSR → first client paint.
   * Defer localStorage / OS preference for the MUI theme until after hydration.
   */
  const muiReady = useHasHydrated();

  const mode = useSyncExternalStore(
    subscribeMode,
    getModeSnapshot,
    getModeServerSnapshot,
  );

  const systemMode = useSyncExternalStore(
    subscribeSystem,
    getSystemSnapshot,
    getSystemServerSnapshot,
  );

  const resolvedMode: ResolvedThemeMode = useMemo(() => {
    if (mode === "system") {
      if (!availableModes.includes("system")) {
        return ssrSafeResolvedMode(themeConfig.defaultMode);
      }
      const preferred = systemMode;
      if (preferred === "dark" && availableModes.includes("dark")) return "dark";
      if (preferred === "light" && availableModes.includes("light")) return "light";
      if (availableModes.includes("light")) return "light";
      if (availableModes.includes("dark")) return "dark";
      return "light";
    }
    if (!availableModes.includes(mode)) {
      return ssrSafeResolvedMode(themeConfig.defaultMode);
    }
    return mode;
  }, [mode, systemMode, availableModes, themeConfig.defaultMode]);

  /** MUI theme sticks to SSR-safe mode until hydrated, then follows preference. */
  const muiResolvedMode: ResolvedThemeMode = muiReady
    ? resolvedMode
    : ssrSafeResolvedMode(themeConfig.defaultMode);

  const tokensKey = useMemo(() => {
    const raw =
      resolvedMode === "dark" ? themeConfig.dark : themeConfig.light;
    return `${resolvedMode}:${themeConfig.borderRadius ?? ""}:${JSON.stringify(raw)}`;
  }, [resolvedMode, themeConfig]);

  const appliedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (appliedKeyRef.current === tokensKey) return;
    appliedKeyRef.current = tokensKey;
    const raw =
      resolvedMode === "dark" ? themeConfig.dark : themeConfig.light;
    const tokens = normalizeColorTokensForMode(raw, resolvedMode);
    applyColorTokens(tokens);
    document.documentElement.classList.toggle("dark", resolvedMode === "dark");
    document.documentElement.style.colorScheme = resolvedMode;
    if (themeConfig.borderRadius) {
      document.documentElement.style.setProperty(
        "--radius-default",
        themeConfig.borderRadius,
      );
    }
  }, [tokensKey, resolvedMode, themeConfig]);

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
    const raw =
      muiResolvedMode === "dark" ? themeConfig.dark : themeConfig.light;
    const tokens = normalizeColorTokensForMode(raw, muiResolvedMode);
    return createAppMuiTheme(
      tokens,
      typography,
      muiResolvedMode,
      themeConfig.borderRadius,
    );
  }, [muiResolvedMode, themeConfig, typography]);

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
