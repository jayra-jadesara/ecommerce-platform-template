import type { ColorTokens, ResolvedThemeMode } from "@/types";

const TOKEN_KEYS: (keyof ColorTokens)[] = [
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
  "surface",
  "card",
  "border",
  "muted",
  "success",
  "warning",
  "error",
];

/** Maps theme color tokens onto document CSS variables. */
export function applyColorTokens(
  tokens: ColorTokens,
  target: HTMLElement = document.documentElement,
): void {
  for (const key of TOKEN_KEYS) {
    target.style.setProperty(`--color-${key}`, tokens[key]);
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
