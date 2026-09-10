/**
 * Lightweight WCAG-oriented contrast helpers for Theme Editor guidance.
 * Not a substitute for full accessibility audits.
 */

function parseHex(input: string): { r: number; g: number; b: number } | null {
  const value = input.trim();
  const short = /^#([0-9a-fA-F]{3})$/.exec(value);
  if (short) {
    const [r, g, b] = short[1]!.split("");
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
    };
  }
  const full = /^#([0-9a-fA-F]{6})$/.exec(value);
  if (!full) return null;
  const hex = full[1]!;
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const r = channelToLinear(rgb.r);
  const g = channelToLinear(rgb.g);
  const b = channelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(foreground: string, background: string): number | null {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  if (l1 == null || l2 == null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastLevel = "fail" | "AA-large" | "AA" | "AAA";

export function contrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "fail";
}

export function contrastGuidance(
  foreground: string,
  background: string,
): { ratio: number; level: ContrastLevel; label: string } | null {
  const ratio = contrastRatio(foreground, background);
  if (ratio == null) return null;
  const level = contrastLevel(ratio);
  const rounded = Math.round(ratio * 100) / 100;
  if (level === "fail") {
    return {
      ratio: rounded,
      level,
      label: "Check contrast",
    };
  }
  if (level === "AA-large") {
    return {
      ratio: rounded,
      level,
      label: "OK for large text",
    };
  }
  return {
    ratio: rounded,
    level,
    label: "Good contrast",
  };
}
