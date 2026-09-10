/**
 * Local logo color extraction — no third-party APIs.
 * Pure helpers are isomorphic; canvas sampling is browser-only.
 */

export type Rgb = { r: number; g: number; b: number };

const NEAR_WHITE_LUM = 0.92;
const NEAR_BLACK_LUM = 0.08;

function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function rgbLuminance({ r, g, b }: Rgb): number {
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function hexToRgb(hex: string): Rgb | null {
  const raw = hex.trim().replace("#", "");
  if (raw.length === 3) {
    return {
      r: Number.parseInt(raw[0]! + raw[0]!, 16),
      g: Number.parseInt(raw[1]! + raw[1]!, 16),
      b: Number.parseInt(raw[2]! + raw[2]!, 16),
    };
  }
  if (raw.length !== 6) return null;
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
}

export function isNearWhite(rgb: Rgb): boolean {
  return rgbLuminance(rgb) >= NEAR_WHITE_LUM;
}

export function isNearBlack(rgb: Rgb): boolean {
  return rgbLuminance(rgb) <= NEAR_BLACK_LUM;
}

export function rgbSaturation({ r, g, b }: Rgb): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
}

export function rgbHue({ r, g, b }: Rgb): number {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return h;
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

/**
 * Quantize RGBA image data into ranked brand-candidate colors.
 * Rejects near-white / near-black / transparent pixels.
 */
export function extractRepresentativeColorsFromImageData(
  data: Uint8ClampedArray | Uint8Array,
  options?: { maxColors?: number },
): string[] {
  const maxColors = options?.maxColors ?? 5;
  const buckets = new Map<string, { rgb: Rgb; count: number; sat: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a < 200) continue;
    const rgb: Rgb = {
      r: data[i] ?? 0,
      g: data[i + 1] ?? 0,
      b: data[i + 2] ?? 0,
    };
    if (isNearWhite(rgb) || isNearBlack(rgb)) continue;
    // 5-bit quantization keeps buckets intentional without muddy noise
    const qr = rgb.r >> 3;
    const qg = rgb.g >> 3;
    const qb = rgb.b >> 3;
    const key = `${qr}:${qg}:${qb}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      const approx: Rgb = {
        r: (qr << 3) + 4,
        g: (qg << 3) + 4,
        b: (qb << 3) + 4,
      };
      buckets.set(key, {
        rgb: approx,
        count: 1,
        sat: rgbSaturation(approx),
      });
    }
  }

  const ranked = [...buckets.values()]
    .map((entry) => ({
      ...entry,
      score: entry.count * (0.55 + entry.sat * 1.45),
    }))
    .sort((a, b) => b.score - a.score);

  const selected: Rgb[] = [];
  for (const entry of ranked) {
    if (selected.length >= maxColors) break;
    const hue = rgbHue(entry.rgb);
    const tooClose = selected.some(
      (s) => hueDistance(rgbHue(s), hue) < 28 && rgbSaturation(s) > 0.15,
    );
    if (tooClose && selected.length > 0) continue;
    selected.push(entry.rgb);
  }

  // Prefer saturated colors first for brand identity
  selected.sort((a, b) => rgbSaturation(b) - rgbSaturation(a));
  return selected.map(rgbToHex);
}

/** Browser-only: sample an image URL via canvas (requires CORS-friendly source). */
export async function extractColorsFromImageUrl(
  url: string,
  options?: { maxColors?: number },
): Promise<string[]> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return [];
  }

  const img = await loadImage(url);
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  return extractRepresentativeColorsFromImageData(data, options);
}

/** Browser-only: sample a local File/Blob. */
export async function extractColorsFromImageFile(
  file: Blob,
  options?: { maxColors?: number },
): Promise<string[]> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await extractColorsFromImageUrl(objectUrl, options);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image for color extraction"));
    img.src = url;
  });
}
