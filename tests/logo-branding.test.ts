import { describe, expect, it } from "vitest";
import {
  extractRepresentativeColorsFromImageData,
  hexToRgb,
  isNearBlack,
  isNearWhite,
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

  it("round-trips hex helpers", () => {
    expect(rgbToHex({ r: 159, g: 18, b: 57 })).toBe("#9f1239");
    expect(hexToRgb("#9f1239")).toEqual({ r: 159, g: 18, b: 57 });
  });
});
