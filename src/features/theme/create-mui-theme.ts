"use client";

import { createTheme, type Theme } from "@mui/material/styles";
import type { ColorTokens, TypographyConfig } from "@/types";

function parseBorderRadius(value: string | undefined): number {
  if (!value) return 8;
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
  if (!match) return 8;
  return Number(match[1]);
}

/** Builds an MUI theme from the same semantic tokens used for CSS variables. */
export function createAppMuiTheme(
  tokens: ColorTokens,
  typography: TypographyConfig,
  mode: "light" | "dark",
  borderRadius?: string,
): Theme {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: tokens.primary,
        contrastText: tokens.buttonForeground,
      },
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
    shape: { borderRadius: parseBorderRadius(borderRadius) },
    components: {
      MuiButton: {
        variants: [
          {
            props: { variant: "contained", color: "primary" },
            style: {
              backgroundColor: "var(--color-button-background)",
              color: "var(--color-button-foreground)",
              "&:hover": {
                backgroundColor: "var(--color-button-background)",
                filter: "brightness(0.92)",
              },
            },
          },
        ],
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            // Keep error red on hover/focus (default hover can flash primary)
            "&.Mui-error:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: tokens.error,
            },
            "&.Mui-focused.Mui-error .MuiOutlinedInput-notchedOutline": {
              borderColor: tokens.error,
            },
          },
        },
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
