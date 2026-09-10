"use client";

import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import SettingsBrightnessOutlinedIcon from "@mui/icons-material/SettingsBrightnessOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useThemeMode } from "@/features/theme";
import { useHasHydrated } from "@/lib/use-has-hydrated";

const LABELS = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System mode",
} as const;

export function ThemeToggle() {
  const hydrated = useHasHydrated();
  const { mode, allowUserToggle, availableModes, cycleMode } = useThemeMode();

  if (!allowUserToggle || availableModes.length <= 1) return null;

  // Until hydrated, show the SSR-safe default icon so markup matches the server.
  const displayMode = hydrated ? mode : "light";

  const Icon =
    displayMode === "dark"
      ? DarkModeOutlinedIcon
      : displayMode === "system"
        ? SettingsBrightnessOutlinedIcon
        : LightModeOutlinedIcon;

  return (
    <Tooltip title={`Theme: ${LABELS[mode]} (click to change)`}>
      <IconButton
        aria-label={`Current theme ${LABELS[mode]}. Switch theme. Available: ${availableModes.join(", ")}.`}
        onClick={cycleMode}
        size="small"
      >
        <Icon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
