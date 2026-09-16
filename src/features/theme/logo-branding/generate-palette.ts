import type { ColorTokens } from "@/types";
import { completeColorTokens } from "@/features/theme/validation";
import {
  hexToRgb,
  hueDistance,
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
  /** Curated Primary / Secondary / Accent triad for UI swatches. */
  sourceColors: string[];
};

const CHROMATIC_SAT = 0.18;
/** Charcoal text/muted role — not muddy brown. */
const CHARCOAL: Rgb = { r: 63, g: 58, b: 54 };
const CORNSILK: Rgb = { r: 255, g: 248, b: 220 };
const MIN_FOOTER_LUM = 0.55;

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

type Hsl = { h: number; s: number; l: number };

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = (((h % 360) + 360) % 360) / 360;
  if (s === 0) {
    const v = clamp(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: clamp(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: clamp(hue2rgb(p, q, hn) * 255),
    b: clamp(hue2rgb(p, q, hn - 1 / 3) * 255),
  };
}

/** Red / warm-brand family (Sonet, Britannia-style logos). */
function isWarmRedFamily(rgb: Rgb): boolean {
  const h = rgbHue(rgb);
  return h < 50 || h > 330;
}

/** Olive / chocolate mud — never promote to secondary/accent. */
function isMuddyBrown(rgb: Rgb): boolean {
  const h = rgbHue(rgb);
  const sat = rgbSaturation(rgb);
  const lum = rgbLuminance(rgb);
  const inBrownHue = h >= 15 && h <= 55;
  return inBrownHue && sat >= 0.2 && sat <= 0.65 && lum > 0.12 && lum < 0.45;
}

/** Charcoal text role for food-brand red logos. */
function deriveSecondary(primary: Rgb): Rgb {
  if (isWarmRedFamily(primary)) {
    return { ...CHARCOAL };
  }
  const hsl = rgbToHsl(primary);
  return hslToRgb({
    h: (hsl.h + 200) % 360,
    s: Math.min(0.35, Math.max(0.18, hsl.s * 0.4)),
    l: Math.max(0.22, Math.min(0.32, hsl.l * 0.5)),
  });
}

/** Britannia-like campaign yellow for red logos; otherwise complementary. */
function deriveAccent(primary: Rgb): Rgb {
  if (isWarmRedFamily(primary)) {
    return hslToRgb({
      h: 46,
      s: 0.88,
      l: 0.58,
    });
  }
  const hsl = rgbToHsl(primary);
  return hslToRgb({
    h: (hsl.h + 150) % 360,
    s: Math.min(0.9, Math.max(0.62, hsl.s * 0.95 + 0.12)),
    l: Math.max(0.48, Math.min(0.62, hsl.l * 0.85 + 0.22)),
  });
}

function ensureReadablePrimary(hex: string): Rgb {
  const rgb = hexToRgb(hex) ?? { r: 159, g: 18, b: 57 };
  if (isNearWhite(rgb) || rgbSaturation(rgb) < 0.12) {
    return { r: 159, g: 18, b: 57 };
  }
  if (isNearBlack(rgb)) {
    return lighten(rgb, 0.35);
  }
  if (rgbSaturation(rgb) < 0.35) {
    return darken(rgb, 0.08);
  }
  return rgb;
}

function isChromatic(rgb: Rgb): boolean {
  return rgbSaturation(rgb) >= CHROMATIC_SAT;
}

function isUsableSecondHue(c: Rgb, primary: Rgb): boolean {
  if (!isChromatic(c)) return false;
  if (hueDistance(rgbHue(c), rgbHue(primary)) <= 40) return false;
  if (isMuddyBrown(c)) return false;
  // Reject mid olive/brown mud even if sat is high
  const h = rgbHue(c);
  if (h >= 25 && h <= 70 && rgbLuminance(c) < 0.4 && rgbSaturation(c) < 0.7) {
    return false;
  }
  return true;
}

function isUsableAccentFromLogo(c: Rgb, primary: Rgb, secondary: Rgb): boolean {
  if (!isChromatic(c)) return false;
  if (isMuddyBrown(c)) return false;
  if (hueDistance(rgbHue(c), rgbHue(primary)) <= 25) return false;
  if (hueDistance(rgbHue(c), rgbHue(secondary)) <= 25) return false;
  // Prefer warm yellows / clear second brand hues — skip dark browns
  if (rgbLuminance(c) < 0.28) return false;
  return true;
}

/**
 * Force campaign footer yellow above MIN_FOOTER_LUM for Britannia punch.
 */
function ensureBrightFooterYellow(accent: Rgb): Rgb {
  let footer = mix(accent, CORNSILK, 0.32);
  let guard = 0;
  while (rgbLuminance(footer) < MIN_FOOTER_LUM && guard < 8) {
    footer = mix(footer, CORNSILK, 0.22);
    guard += 1;
  }
  // Keep enough chroma so it still reads yellow, not cream
  const hsl = rgbToHsl(footer);
  if (hsl.s < 0.55) {
    footer = hslToRgb({
      h: isWarmRedFamily(accent) || hsl.h < 70 ? 46 : hsl.h,
      s: Math.max(0.72, hsl.s),
      l: Math.max(0.58, Math.min(0.72, hsl.l)),
    });
  }
  if (rgbLuminance(footer) < MIN_FOOTER_LUM) {
    footer = hslToRgb({ h: 46, s: 0.82, l: 0.62 });
  }
  return footer;
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

  const chromatics = parsed.filter(isChromatic);
  const seeds = chromatics.length > 0 ? chromatics : parsed;

  const primary = ensureReadablePrimary(
    seeds[0] ? rgbToHex(seeds[0]) : "#9f1239",
  );

  const foodBrand = isWarmRedFamily(primary);

  if (foodBrand) {
    // Red logos: charcoal secondary + campaign yellow accent (Britannia recipe).
    const fromLogoSecond = seeds.find((c) => isUsableSecondHue(c, primary));
    const secondary = fromLogoSecond ?? deriveSecondary(primary);
    // Always prefer derived campaign yellow for red family — logo rarely has yellow.
    const accent = deriveAccent(primary);
    return { primary, secondary, accent };
  }

  const fromLogoSecondary = seeds.find((c) => isUsableSecondHue(c, primary));
  const secondary = fromLogoSecondary ?? deriveSecondary(primary);

  const fromLogoAccent = seeds.find((c) =>
    isUsableAccentFromLogo(c, primary, secondary),
  );
  const accent = fromLogoAccent ?? deriveAccent(primary);

  return { primary, secondary, accent };
}

function buildLight(primary: Rgb, secondary: Rgb, accent: Rgb): ColorTokens | null {
  // Britannia-style light: cream page, brand CTAs, bright yellow footer.
  const tint = lighten(primary, 0.94);
  const background = mix(tint, { r: 255, g: 248, b: 240 }, 0.68);
  const surface = lighten(background, 0.45);
  const card = { r: 255, g: 255, b: 255 };
  const border = mix(primary, { r: 231, g: 223, b: 214 }, 0.85);
  const muted = mix(CHARCOAL, { r: 120, g: 113, b: 108 }, 0.35);
  const foreground = { r: 28, g: 25, b: 23 };
  const footerBg = ensureBrightFooterYellow(accent);
  const footerFg = { r: 26, g: 22, b: 18 };

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
      footerForeground: rgbToHex(footerFg),
      buttonBackground: rgbToHex(primary),
      buttonForeground: contrastText(primary),
    },
    contrastText(primary),
  );
}

function buildDark(primary: Rgb, secondary: Rgb, accent: Rgb): ColorTokens | null {
  // Soft charcoal chrome — not pure black voids.
  const darkPrimary = lighten(primary, 0.22);
  const background = { r: 18, g: 18, b: 18 };
  const surface = { r: 28, g: 28, b: 28 };
  const card = { r: 36, g: 36, b: 36 };
  const border = mix(darkPrimary, { r: 58, g: 58, b: 58 }, 0.72);
  const foreground = { r: 250, g: 250, b: 250 };
  const muted = { r: 168, g: 168, b: 168 };
  const accentHsl = rgbToHsl(accent);
  const accentMuted = hslToRgb({
    h: accentHsl.h,
    s: Math.min(0.5, accentHsl.s * 0.7),
    l: Math.min(0.5, Math.max(0.4, accentHsl.l * 0.85)),
  });
  // Elevated charcoal footer (readable band, not #000)
  const footerBg = { r: 32, g: 30, b: 28 };
  const footerFg = { r: 245, g: 240, b: 232 };
  const secondaryLite = lighten(
    isMuddyBrown(secondary) ? CHARCOAL : secondary,
    0.35,
  );

  return completeColorTokens(
    {
      primary: rgbToHex(darkPrimary),
      secondary: rgbToHex(secondaryLite),
      accent: rgbToHex(accentMuted),
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
      footerBackground: rgbToHex(footerBg),
      footerForeground: rgbToHex(footerFg),
      buttonBackground: rgbToHex(darkPrimary),
      buttonForeground: contrastText(darkPrimary),
    },
    contrastText(darkPrimary),
  );
}

/**
 * Build intentional light + dark themes from extracted logo colors.
 * Red/black logos get a Britannia-style cream + red + yellow recipe.
 * Always returns a curated Primary / Secondary / Accent triad in sourceColors.
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
    sourceColors: [rgbToHex(primary), rgbToHex(secondary), rgbToHex(accent)],
  };
}
