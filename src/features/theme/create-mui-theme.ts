"use client";

import { createTheme, type Theme } from "@mui/material/styles";
import type { ColorTokens, TypographyConfig } from "@/types";

/** Builds an MUI theme that reads semantic CSS variables (shared with Tailwind). */
export function createAppMuiTheme(
  tokens: ColorTokens,
  typography: TypographyConfig,
  mode: "light" | "dark",
): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: tokens.primary },
      secondary: { main: tokens.secondary },
      error: { main: tokens.error },
      warning: { main: tokens.warning },
      success: { main: tokens.success },
      background: {
        default: tokens.background,
        paper: tokens.surface,
      },
      text: {
        primary: tokens.foreground,
        secondary: tokens.muted,
      },
      divider: tokens.border,
    },
    typography: {
      fontFamily: typography.fontSans,
      fontSize: typography.baseSizePx,
      fontWeightRegular: typography.bodyWeight,
      fontWeightMedium: typography.headingWeight,
      h1: { fontFamily: typography.fontDisplay ?? typography.fontSans },
      h2: { fontFamily: typography.fontDisplay ?? typography.fontSans },
      h3: { fontFamily: typography.fontDisplay ?? typography.fontSans },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiButtonBase: {
        defaultProps: { disableRipple: false },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: "var(--color-background)",
            color: "var(--color-foreground)",
          },
        },
      },
    },
  });
}
