import type { ThemeConfig, ThemeMode } from "@/types";

/**
 * Modes the storefront may expose, derived from Admin-enabled modes.
 * localStorage preferences must never unlock disabled modes.
 */
export function getAvailableThemeModes(theme: ThemeConfig): ThemeMode[] {
  const enabled = theme.enabledModes.filter(
    (mode, index, all) => all.indexOf(mode) === index,
  );

  if (enabled.length === 0) {
    return [theme.defaultMode];
  }

  if (!enabled.includes(theme.defaultMode)) {
    return [theme.defaultMode, ...enabled.filter((m) => m !== theme.defaultMode)];
  }

  return enabled;
}

export function canUserToggleTheme(theme: ThemeConfig): boolean {
  return theme.allowUserToggle && getAvailableThemeModes(theme).length > 1;
}

export function sanitizeStoredMode(
  stored: string | null | undefined,
  theme: ThemeConfig,
): ThemeMode {
  const available = getAvailableThemeModes(theme);
  if (stored === "light" || stored === "dark" || stored === "system") {
    if (available.includes(stored)) return stored;
  }
  return theme.defaultMode;
}

export function nextThemeMode(
  current: ThemeMode,
  theme: ThemeConfig,
): ThemeMode {
  const available = getAvailableThemeModes(theme);
  const idx = available.indexOf(current);
  if (idx === -1) return theme.defaultMode;
  return available[(idx + 1) % available.length];
}
