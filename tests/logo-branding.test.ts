import { describe, expect, it } from "vitest";
import {
  extractRepresentativeColorsFromImageData,
  hexToRgb,
  hueDistance,
  isNearBlack,
  isNearWhite,
  rgbHue,
  rgbLuminance,
  rgbSaturation,
  rgbToHex,
} from "@/features/theme/logo-branding/extract-colors";
import { generateBrandThemeFromColors } from "@/features/theme/logo-branding/generate-palette";
import { contrastRatio } from "@/features/admin/theme/contrast";

function solidImageData(hex: string, size = 8): Uint8ClampedArray {
  const rgb = hexToRgb(hex)!;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb.r;
    data[i + 1] = rgb.g;
    data[i + 2] = rgb.b;
    data[i + 3] = 255;
  }
  return data;
}

/** Half red, half teal — distinct chromatic hues. */
function dualHueImageData(size = 16): Uint8ClampedArray {
  const red = hexToRgb("#c41e3a")!;
  const teal = hexToRgb("#0d9488")!;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const c = x < size / 2 ? red : teal;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  return data;
}

describe("logo color extraction", () => {
  it("rejects near-white and near-black pixels", () => {
    expect(isNearWhite({ r: 255, g: 255, b: 255 })).toBe(true);
    expect(isNearWhite({ r: 250, g: 250, b: 248 })).toBe(true);
    expect(isNearBlack({ r: 0, g: 0, b: 0 })).toBe(true);
    expect(isNearBlack({ r: 12, g: 10, b: 8 })).toBe(true);
    expect(isNearWhite({ r: 180, g: 40, b: 60 })).toBe(false);
  });

  it("extracts a representative brand color from solid image data", () => {
    const data = solidImageData("#9f1239");
    const colors = extractRepresentativeColorsFromImageData(data, {
      maxColors: 3,
    });
    expect(colors.length).toBeGreaterThan(0);
    const first = hexToRgb(colors[0]!);
    expect(first).not.toBeNull();
    expect(first!.r).toBeGreaterThan(120);
    expect(first!.b).toBeLessThan(120);
  });

  it("ignores near-white logo canvases", () => {
    const data = solidImageData("#ffffff");
    const colors = extractRepresentativeColorsFromImageData(data);
    expect(colors).toEqual([]);
  });

  it("extracts at least two distinct chromatic hues from multi-hue data", () => {
    const colors = extractRepresentativeColorsFromImageData(dualHueImageData(), {
      maxColors: 5,
    });
    const chromatics = colors
      .map((c) => hexToRgb(c)!)
      .filter((rgb) => rgbSaturation(rgb) >= 0.18);
    expect(chromatics.length).toBeGreaterThanOrEqual(2);
    expect(hueDistance(rgbHue(chromatics[0]!), rgbHue(chromatics[1]!))).toBeGreaterThan(
      30,
    );
  });

  it("does not fill the palette with low-sat greys when a brand hue exists", () => {
    // Mostly brand red + a thin grey strip (edge noise)
    const size = 16;
    const red = hexToRgb("#c41e3a")!;
    const grey = { r: 160, g: 158, b: 162 };
    const data = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const c = x === 0 ? grey : red;
        data[i] = c.r;
        data[i + 1] = c.g;
        data[i + 2] = c.b;
        data[i + 3] = 255;
      }
    }
    const colors = extractRepresentativeColorsFromImageData(data, {
      maxColors: 5,
    });
    expect(colors.length).toBeGreaterThan(0);
    const first = hexToRgb(colors[0]!)!;
    expect(rgbSaturation(first)).toBeGreaterThanOrEqual(0.18);
    // Should not return multiple greys alongside the brand color
    const greys = colors.filter((c) => rgbSaturation(hexToRgb(c)!) < 0.18);
    expect(greys.length).toBeLessThanOrEqual(1);
  });
});

describe("logo palette generation", () => {
  it("builds intentional light and dark themes from seed colors", () => {
    const theme = generateBrandThemeFromColors(["#9f1239", "#d97706", "#44403c"]);
    expect(theme).not.toBeNull();
    expect(theme!.light.primary.toLowerCase()).toContain("9");
    expect(theme!.dark.background).not.toEqual(theme!.light.background);
    expect(theme!.light.buttonBackground).toBeTruthy();
    expect(theme!.dark.buttonBackground).toBeTruthy();

    const lightBtn = contrastRatio(
      theme!.light.buttonForeground,
      theme!.light.buttonBackground,
    );
    const darkBtn = contrastRatio(
      theme!.dark.buttonForeground,
      theme!.dark.buttonBackground,
    );
    expect(lightBtn).not.toBeNull();
    expect(darkBtn).not.toBeNull();
    expect(lightBtn!).toBeGreaterThanOrEqual(3);
    expect(darkBtn!).toBeGreaterThanOrEqual(3);
  });

  it("falls back when source colors are only near-white/black", () => {
    const theme = generateBrandThemeFromColors(["#ffffff", "#000000"]);
    expect(theme).not.toBeNull();
    expect(theme!.light.primary).toBeTruthy();
    expect(isNearWhite(hexToRgb(theme!.light.primary)!)).toBe(false);
  });

  it("returns a curated primary/secondary/accent triad for a single-hue logo", () => {
    const theme = generateBrandThemeFromColors(["#c41e3a"]);
    expect(theme).not.toBeNull();
    expect(theme!.sourceColors).toHaveLength(3);

    const [primary, secondary, accent] = theme!.sourceColors.map(
      (c) => hexToRgb(c)!,
    );
    expect(rgbSaturation(primary!)).toBeGreaterThanOrEqual(0.18);
    // Food-brand secondary is charcoal (may be low-sat); accent is campaign yellow
    expect(rgbLuminance(secondary!)).toBeLessThan(0.35);
    expect(rgbSaturation(accent!)).toBeGreaterThanOrEqual(0.55);

    expect(hueDistance(rgbHue(primary!), rgbHue(accent!))).toBeGreaterThan(15);

    const unique = new Set(theme!.sourceColors.map((c) => c.toLowerCase()));
    expect(unique.size).toBe(3);
  });

  it("uses a bright yellow footer in light and a dark footer in dark (Britannia harmony)", () => {
    const theme = generateBrandThemeFromColors(["#c41e3a"]);
    expect(theme).not.toBeNull();

    const lightFooter = hexToRgb(theme!.light.footerBackground)!;
    const darkFooter = hexToRgb(theme!.dark.footerBackground)!;
    const accent = hexToRgb(theme!.sourceColors[2]!)!;
    const secondary = hexToRgb(theme!.sourceColors[1]!)!;

    expect(rgbLuminance(lightFooter)).toBeGreaterThan(0.55);
    expect(rgbLuminance(darkFooter)).toBeLessThan(0.2);
    expect(isNearWhite(lightFooter)).toBe(false);

    // Accent in yellow band
    const accentHue = rgbHue(accent);
    expect(accentHue).toBeGreaterThan(30);
    expect(accentHue).toBeLessThan(65);

    // Secondary is charcoal — not muddy mid-brown wash
    expect(rgbLuminance(secondary)).toBeLessThan(0.35);
    expect(rgbSaturation(secondary)).toBeLessThan(0.35);

    // Dark chrome is soft charcoal, not pure #000
    expect(theme!.dark.background.toLowerCase()).not.toBe("#000000");
    expect(theme!.dark.footerBackground.toLowerCase()).not.toBe("#000000");
    expect(theme!.dark.footerBackground.toLowerCase()).not.toBe(
      theme!.dark.background.toLowerCase(),
    );
    expect(rgbLuminance(hexToRgb(theme!.dark.background)!)).toBeLessThan(0.08);
    expect(rgbLuminance(hexToRgb(theme!.dark.surface)!)).toBeLessThan(0.12);
    expect(rgbLuminance(darkFooter)).toBeGreaterThan(
      rgbLuminance(hexToRgb(theme!.dark.background)!),
    );
  });

  it("round-trips hex helpers", () => {
    expect(rgbToHex({ r: 159, g: 18, b: 57 })).toBe("#9f1239");
    expect(hexToRgb("#9f1239")).toEqual({ r: 159, g: 18, b: 57 });
  });
});
