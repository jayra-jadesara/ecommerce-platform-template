"use client";

import { createTheme, type Theme } from "@mui/material/styles";
import type { ColorTokens, TypographyConfig } from "@/types";
import { normalizeStoredFontCss } from "@/features/theme/typography-css";

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
  const fontSans = normalizeStoredFontCss(typography.fontSans, "sans");
  const fontDisplay = normalizeStoredFontCss(
    typography.fontDisplay,
    "display",
  );

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
      fontFamily: fontSans,
      fontSize: typography.baseSizePx,
      fontWeightRegular: typography.bodyWeight,
      fontWeightMedium: typography.headingWeight,
      h1: { fontFamily: fontDisplay },
      h2: { fontFamily: fontDisplay },
      h3: { fontFamily: fontDisplay },
    },
    shape: { borderRadius: parseBorderRadius(borderRadius) },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            minHeight: 40,
          },
        },
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
      MuiTextField: {
        defaultProps: {
          size: "medium",
          margin: "none",
        },
      },
      MuiFormControl: {
        defaultProps: {
          margin: "none",
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: "var(--color-card)",
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: tokens.primary,
            },
            "&.Mui-error:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: tokens.error,
            },
            "&.Mui-focused.Mui-error .MuiOutlinedInput-notchedOutline": {
              borderColor: tokens.error,
            },
          },
          input: {
            paddingTop: 12,
            paddingBottom: 12,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            "&.Mui-focused": {
              color: tokens.primary,
            },
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          asterisk: {
            color: tokens.error,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 48,
          },
          indicator: {
            height: 3,
            borderRadius: 3,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            minHeight: 48,
            paddingInline: 16,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: parseBorderRadius(borderRadius) + 4,
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: `
          :root {
            --scrollbar-size: 10px;
            --scrollbar-thumb: var(--color-primary);
            --scrollbar-track: color-mix(in srgb, var(--color-surface) 55%, var(--color-border));
            --scrollbar-thumb-hover: color-mix(in srgb, var(--color-primary) 78%, #000 22%);
          }
          html.dark {
            --scrollbar-thumb-hover: color-mix(in srgb, var(--color-primary) 85%, #fff 15%);
          }
          @supports (-moz-appearance: none) {
            * {
              scrollbar-width: thin;
              scrollbar-color: var(--color-primary) var(--scrollbar-track);
            }
          }
          ::-webkit-scrollbar {
            width: 10px !important;
            height: 10px !important;
          }
          ::-webkit-scrollbar-track {
            background: var(--scrollbar-track) !important;
          }
          ::-webkit-scrollbar-thumb {
            background-color: var(--color-primary) !important;
            border-radius: 8px !important;
            border: 2px solid var(--scrollbar-track) !important;
            background-clip: padding-box !important;
          }
          ::-webkit-scrollbar-thumb:hover {
            background-color: var(--scrollbar-thumb-hover) !important;
          }
          ::-webkit-scrollbar-corner {
            background: transparent !important;
          }
          .MuiMultiSectionDigitalClockSection-root {
            scrollbar-width: unset !important;
            overflow-y: auto !important;
          }
          .MuiMultiSectionDigitalClockSection-root::-webkit-scrollbar,
          .MuiList-root::-webkit-scrollbar {
            width: 8px !important;
            height: 8px !important;
          }
          .MuiMultiSectionDigitalClockSection-root::-webkit-scrollbar-track,
          .MuiList-root::-webkit-scrollbar-track {
            background: var(--scrollbar-track) !important;
            border-radius: 8px !important;
          }
          .MuiMultiSectionDigitalClockSection-root::-webkit-scrollbar-thumb,
          .MuiList-root::-webkit-scrollbar-thumb {
            background-color: var(--color-primary) !important;
            border-radius: 8px !important;
            border: 2px solid var(--scrollbar-track) !important;
            background-clip: padding-box !important;
          }
          .MuiMultiSectionDigitalClockSection-root::-webkit-scrollbar-thumb:hover,
          .MuiList-root::-webkit-scrollbar-thumb:hover {
            background-color: var(--scrollbar-thumb-hover) !important;
          }
        `,
      },
    },
  });
}
