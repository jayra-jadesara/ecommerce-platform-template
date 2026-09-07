import type { ColorTokens, ResolvedThemeMode } from "@/types";

export const COLOR_TOKEN_TO_CSS_VAR: Record<keyof ColorTokens, string> = {
  primary: "--color-primary",
  secondary: "--color-secondary",
  accent: "--color-accent",
  background: "--color-background",
  foreground: "--color-foreground",
  surface: "--color-surface",
  card: "--color-card",
  border: "--color-border",
  muted: "--color-muted",
  success: "--color-success",
  warning: "--color-warning",
  error: "--color-error",
  headerBackground: "--color-header-background",
  headerForeground: "--color-header-foreground",
  footerBackground: "--color-footer-background",
  footerForeground: "--color-footer-foreground",
  buttonBackground: "--color-button-background",
  buttonForeground: "--color-button-foreground",
};

/** Build a plain style map for SSR / ThemePreview (no DOM). */
export function colorTokensToCssVars(
  tokens: ColorTokens,
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(COLOR_TOKEN_TO_CSS_VAR) as Array<
    [keyof ColorTokens, string]
  >) {
    vars[cssVar] = tokens[key];
  }
  return vars;
}

/** Serialize CSS variables for an inline style attribute / style tag. */
export function serializeCssVars(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}

/** Maps theme color tokens onto an element (defaults to documentElement). */
export function applyColorTokens(
  tokens: ColorTokens,
  target: HTMLElement = document.documentElement,
): void {
  const vars = colorTokensToCssVars(tokens);
  for (const [cssVar, value] of Object.entries(vars)) {
    target.style.setProperty(cssVar, value);
  }
}

export function getSystemResolvedMode(): ResolvedThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveThemeMode(
  mode: "light" | "dark" | "system",
): ResolvedThemeMode {
  if (mode === "system") return getSystemResolvedMode();
  return mode;
}
