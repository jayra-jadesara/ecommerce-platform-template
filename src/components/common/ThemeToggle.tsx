"use client";

import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import SettingsBrightnessOutlinedIcon from "@mui/icons-material/SettingsBrightnessOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useThemeMode } from "@/features/theme";

const LABELS = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System mode",
} as const;

export function ThemeToggle() {
  const { mode, allowUserToggle, availableModes, cycleMode } = useThemeMode();

  if (!allowUserToggle || availableModes.length <= 1) return null;

  const Icon =
    mode === "dark"
      ? DarkModeOutlinedIcon
      : mode === "system"
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
