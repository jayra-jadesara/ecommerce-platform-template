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

function hexToRgb(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace("#", "");
  if (raw.length === 3) {
    return [
      Number.parseInt(raw[0] + raw[0], 16),
      Number.parseInt(raw[1] + raw[1], 16),
      Number.parseInt(raw[2] + raw[2], 16),
    ];
  }
  if (raw.length !== 6 || Number.isNaN(Number.parseInt(raw, 16))) return null;
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

/** Relative luminance 0–1 (sRGB). Unknown colors return mid-grey. */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastForeground(
  backgroundHex: string,
  light = "#f2f0eb",
  dark = "#0f1412",
): string {
  return relativeLuminance(backgroundHex) > 0.45 ? dark : light;
}

/**
 * Softens dark-mode CTAs that were configured as near-white (harsh / unreadable
 * against dark storefronts), repairs weak button text contrast, and lifts flat
 * or overly brown chrome into a premium neutral charcoal hierarchy.
 */
export function normalizeColorTokensForMode(
  tokens: ColorTokens,
  mode: ResolvedThemeMode,
): ColorTokens {
  if (mode !== "dark") return tokens;

  let next: ColorTokens = { ...tokens };

  const backgroundLum = relativeLuminance(next.background);
  const surfaceLum = relativeLuminance(next.surface);
  const cardLum = relativeLuminance(next.card);
  const buttonLum = relativeLuminance(next.buttonBackground);

  if (backgroundLum < 0.3 && buttonLum > 0.82) {
    next = {
      ...next,
      buttonBackground: next.primary,
      buttonForeground: contrastForeground(next.primary),
    };
  }

  const foregroundLum = relativeLuminance(next.buttonForeground);
  const fixedButtonLum = relativeLuminance(next.buttonBackground);
  if (Math.abs(fixedButtonLum - foregroundLum) < 0.35) {
    next = {
      ...next,
      buttonForeground: contrastForeground(next.buttonBackground),
    };
  }

  const layersTooFlat =
    backgroundLum < 0.045 ||
    (cardLum - backgroundLum < 0.018 && surfaceLum - backgroundLum < 0.012);

  const bgRgb = hexToRgb(next.background);
  const chromeIsBrown =
    Boolean(bgRgb) &&
    bgRgb![0] - bgRgb![2] >= 12 &&
    bgRgb![0] > bgRgb![1];

  if (layersTooFlat || chromeIsBrown) {
    // Neutral zinc charcoal — brand color stays on CTAs only.
    next = {
      ...next,
      background: "#0c0c0e",
      surface: "#141416",
      card: "#1c1c1f",
      border: "#2e2e33",
      headerBackground: "#141416",
      footerBackground: "#101012",
      muted:
        relativeLuminance(next.muted) < 0.25 || chromeIsBrown
          ? "#a1a1aa"
          : next.muted,
      foreground:
        relativeLuminance(next.foreground) < 0.6 ? "#fafafa" : next.foreground,
    };
  }

  return next;
}

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
