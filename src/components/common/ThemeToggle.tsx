"use client";

import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import SettingsBrightnessOutlinedIcon from "@mui/icons-material/SettingsBrightnessOutlined";
import { useThemeModeOptional } from "@/features/theme";
import { cn } from "@/lib/cn";

const LABELS = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System mode",
} as const;

/**
 * Native theme control — avoids MUI Emotion SSR/client class mismatches.
 * Mode comes from useSyncExternalStore (SSR snapshot matches first client paint).
 */
export function ThemeToggle() {
  const theme = useThemeModeOptional();
  if (!theme) return null;

  const { mode, allowUserToggle, availableModes, cycleMode } = theme;

  if (!allowUserToggle || availableModes.length <= 1) return null;

  const label = LABELS[mode];

  const Icon =
    mode === "dark"
      ? DarkModeOutlinedIcon
      : mode === "system"
        ? SettingsBrightnessOutlinedIcon
        : LightModeOutlinedIcon;

  return (
    <button
      type="button"
      title={`Theme: ${label} (click to change)`}
      aria-label={`Current theme ${label}. Switch theme. Available: ${availableModes.join(", ")}.`}
      onClick={cycleMode}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-header-foreground)] transition-colors",
        "hover:bg-[color-mix(in_srgb,var(--color-header-foreground)_8%,transparent)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
      )}
    >
      <Icon fontSize="small" />
    </button>
  );
}
