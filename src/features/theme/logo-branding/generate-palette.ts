import type { ColorTokens } from "@/types";
import { completeColorTokens } from "@/features/theme/validation";
import {
  hexToRgb,
  isNearBlack,
  isNearWhite,
  rgbHue,
  rgbLuminance,
  rgbSaturation,
  rgbToHex,
  type Rgb,
} from "@/features/theme/logo-branding/extract-colors";

export type GeneratedBrandTheme = {
  light: ColorTokens;
  dark: ColorTokens;
  sourceColors: string[];
};

function clamp(n: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: clamp(a.r + (b.r - a.r) * t),
    g: clamp(a.g + (b.g - a.g) * t),
    b: clamp(a.b + (b.b - a.b) * t),
  };
}

function lighten(rgb: Rgb, amount: number): Rgb {
  return mix(rgb, { r: 255, g: 255, b: 255 }, amount);
}

function darken(rgb: Rgb, amount: number): Rgb {
  return mix(rgb, { r: 0, g: 0, b: 0 }, amount);
}

function contrastText(bg: Rgb): string {
  return rgbLuminance(bg) > 0.45 ? "#1c1917" : "#fff8f0";
}

function ensureReadablePrimary(hex: string): Rgb {
  const rgb = hexToRgb(hex) ?? { r: 159, g: 18, b: 57 };
  if (isNearWhite(rgb) || rgbSaturation(rgb) < 0.12) {
    return { r: 159, g: 18, b: 57 };
  }
  if (isNearBlack(rgb)) {
    return lighten(rgb, 0.35);
  }
  // Boost mid-sat brand colors slightly for CTAs
  if (rgbSaturation(rgb) < 0.35) {
    return darken(rgb, 0.08);
  }
  return rgb;
}

function pickSeeds(sourceColors: string[]): {
  primary: Rgb;
  secondary: Rgb;
  accent: Rgb;
} {
  const parsed = sourceColors
    .map((c) => hexToRgb(c))
    .filter((c): c is Rgb => Boolean(c))
    .filter((c) => !isNearWhite(c) && !isNearBlack(c));

  const primary = ensureReadablePrimary(
    parsed[0] ? rgbToHex(parsed[0]) : "#9f1239",
  );

  let secondary =
    parsed.find((c) => Math.abs(rgbHue(c) - rgbHue(primary)) > 40) ??
    darken(primary, 0.35);
  if (rgbSaturation(secondary) < 0.1) {
    secondary = { r: 68, g: 64, b: 60 };
  }

  let accent =
    parsed.find(
      (c) =>
        Math.abs(rgbHue(c) - rgbHue(primary)) > 25 &&
        Math.abs(rgbHue(c) - rgbHue(secondary)) > 25,
    ) ?? lighten({ r: 217, g: 119, b: 6 }, 0);

  // Prefer warmer accent if only one hue family
  if (Math.abs(rgbHue(accent) - rgbHue(primary)) < 18) {
    accent = { r: 217, g: 119, b: 6 };
  }

  return { primary, secondary, accent };
}

function buildLight(primary: Rgb, secondary: Rgb, accent: Rgb): ColorTokens | null {
  const tint = lighten(primary, 0.92);
  const background = mix(tint, { r: 255, g: 248, b: 240 }, 0.55);
  const surface = lighten(background, 0.35);
  const card = { r: 255, g: 255, b: 255 };
  const border = mix(primary, { r: 231, g: 223, b: 214 }, 0.82);
  const muted = mix(secondary, { r: 120, g: 113, b: 108 }, 0.55);
  const foreground = { r: 28, g: 25, b: 23 };
  const footerBg = darken(primary, 0.72);

  return completeColorTokens(
    {
      primary: rgbToHex(primary),
      secondary: rgbToHex(secondary),
      accent: rgbToHex(accent),
      background: rgbToHex(background),
      foreground: rgbToHex(foreground),
      surface: rgbToHex(surface),
      card: rgbToHex(card),
      border: rgbToHex(border),
      muted: rgbToHex(muted),
      success: "#3f6212",
      warning: "#a16207",
      error: "#b91c1c",
      headerBackground: rgbToHex(surface),
      headerForeground: rgbToHex(foreground),
      footerBackground: rgbToHex(footerBg),
      footerForeground: contrastText(footerBg),
      buttonBackground: rgbToHex(primary),
      buttonForeground: contrastText(primary),
    },
    contrastText(primary),
  );
}

function buildDark(primary: Rgb, secondary: Rgb, accent: Rgb): ColorTokens | null {
  const darkPrimary = lighten(primary, 0.28);
  const background = darken(mix(primary, { r: 20, g: 15, b: 12 }, 0.85), 0.15);
  const surface = lighten(background, 0.08);
  const card = lighten(background, 0.14);
  const border = lighten(background, 0.22);
  const foreground = { r: 250, g: 246, b: 241 };
  const muted = mix(secondary, { r: 168, g: 162, b: 158 }, 0.7);
  const accentLite = lighten(accent, 0.18);

  return completeColorTokens(
    {
      primary: rgbToHex(darkPrimary),
      secondary: rgbToHex(lighten(secondary, 0.25)),
      accent: rgbToHex(accentLite),
      background: rgbToHex(background),
      foreground: rgbToHex(foreground),
      surface: rgbToHex(surface),
      card: rgbToHex(card),
      border: rgbToHex(border),
      muted: rgbToHex(muted),
      success: "#a3e635",
      warning: "#fbbf24",
      error: "#f87171",
      headerBackground: rgbToHex(surface),
      headerForeground: rgbToHex(foreground),
      footerBackground: rgbToHex(darken(background, 0.25)),
      footerForeground: rgbToHex(mix(foreground, muted, 0.25)),
      buttonBackground: rgbToHex(darkPrimary),
      buttonForeground: contrastText(darkPrimary),
    },
    contrastText(darkPrimary),
  );
}

/**
 * Build intentional light + dark themes from extracted logo colors.
 * Falls back to spice-inspired seeds when extraction yields nothing usable.
 */
export function generateBrandThemeFromColors(
  sourceColors: string[],
): GeneratedBrandTheme | null {
  const usable = sourceColors.filter((hex) => {
    const rgb = hexToRgb(hex);
    return rgb && !isNearWhite(rgb) && !isNearBlack(rgb);
  });

  const { primary, secondary, accent } = pickSeeds(usable);
  const light = buildLight(primary, secondary, accent);
  const dark = buildDark(primary, secondary, accent);
  if (!light || !dark) return null;

  return {
    light,
    dark,
    sourceColors: usable.length
      ? usable.slice(0, 5)
      : [rgbToHex(primary), rgbToHex(secondary), rgbToHex(accent)],
  };
}
