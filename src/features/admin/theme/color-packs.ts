import type { ColorTokens } from "@/types";

function withChrome(
  base: Omit<
    ColorTokens,
    | "headerBackground"
    | "headerForeground"
    | "footerBackground"
    | "footerForeground"
    | "buttonBackground"
    | "buttonForeground"
  >,
  buttonForeground: string,
): ColorTokens {
  return {
    ...base,
    headerBackground: base.surface,
    headerForeground: base.foreground,
    footerBackground: base.surface,
    footerForeground: base.muted,
    buttonBackground: base.primary,
    buttonForeground,
  };
}

export type ThemeColorPack = {
  id: string;
  name: string;
  description: string;
  /** Swatches shown on the pack card (primary, accent, background). */
  preview: [string, string, string];
  light: ColorTokens;
  dark: ColorTokens;
};

/**
 * Curated look packs for merchants who are not designers.
 * Each pack sets light + dark + header/footer/button chrome together.
 */
export const THEME_COLOR_PACKS: ThemeColorPack[] = [
  {
    id: "forest",
    name: "Forest green",
    description: "Fresh and natural — great for groceries and wellness.",
    preview: ["#1a5f4a", "#c4783a", "#f7f5f2"],
    light: withChrome(
      {
        primary: "#1a5f4a",
        secondary: "#2c3e50",
        accent: "#c4783a",
        background: "#f7f5f2",
        foreground: "#1a1a1a",
        surface: "#ffffff",
        card: "#ffffff",
        border: "#e2ddd6",
        muted: "#6b6560",
        success: "#2e7d4f",
        warning: "#b7791f",
        error: "#b42318",
      },
      "#ffffff",
    ),
    dark: withChrome(
      {
        primary: "#4fd1a5",
        secondary: "#94a3b8",
        accent: "#e8a05c",
        background: "#0f1412",
        foreground: "#f2f0eb",
        surface: "#1a211e",
        card: "#222a26",
        border: "#2f3a35",
        muted: "#9ca89f",
        success: "#4ade80",
        warning: "#fbbf24",
        error: "#f87171",
      },
      "#0f1412",
    ),
  },
  {
    id: "ocean",
    name: "Ocean blue",
    description: "Calm and trustworthy — good for everyday shopping.",
    preview: ["#1d4e89", "#0ea5a0", "#f4f7fb"],
    light: withChrome(
      {
        primary: "#1d4e89",
        secondary: "#334155",
        accent: "#0ea5a0",
        background: "#f4f7fb",
        foreground: "#0f172a",
        surface: "#ffffff",
        card: "#ffffff",
        border: "#d7e0ea",
        muted: "#64748b",
        success: "#15803d",
        warning: "#b45309",
        error: "#b91c1c",
      },
      "#ffffff",
    ),
    dark: withChrome(
      {
        primary: "#60a5fa",
        secondary: "#94a3b8",
        accent: "#2dd4bf",
        background: "#0b1220",
        foreground: "#e8eef7",
        surface: "#121a2a",
        card: "#182235",
        border: "#2a374d",
        muted: "#94a3b8",
        success: "#4ade80",
        warning: "#fbbf24",
        error: "#f87171",
      },
      "#0b1220",
    ),
  },
  {
    id: "spice",
    name: "Warm spice",
    description: "Rich and inviting — fits spices, kitchens, and food brands.",
    preview: ["#9a3412", "#ca8a04", "#faf6f1"],
    light: withChrome(
      {
        primary: "#9a3412",
        secondary: "#44403c",
        accent: "#ca8a04",
        background: "#faf6f1",
        foreground: "#1c1917",
        surface: "#ffffff",
        card: "#ffffff",
        border: "#e7e0d6",
        muted: "#78716c",
        success: "#3f6212",
        warning: "#a16207",
        error: "#b91c1c",
      },
      "#ffffff",
    ),
    dark: withChrome(
      {
        primary: "#fb923c",
        secondary: "#a8a29e",
        accent: "#facc15",
        background: "#1c1410",
        foreground: "#faf6f1",
        surface: "#271c16",
        card: "#32241c",
        border: "#4a372c",
        muted: "#a8a29e",
        success: "#a3e635",
        warning: "#fbbf24",
        error: "#f87171",
      },
      "#1c1410",
    ),
  },
  {
    id: "ink",
    name: "Modern ink",
    description: "Clean black and white — premium and simple.",
    preview: ["#111827", "#4b5563", "#f8fafc"],
    light: withChrome(
      {
        primary: "#111827",
        secondary: "#4b5563",
        accent: "#2563eb",
        background: "#f8fafc",
        foreground: "#0f172a",
        surface: "#ffffff",
        card: "#ffffff",
        border: "#e2e8f0",
        muted: "#64748b",
        success: "#15803d",
        warning: "#b45309",
        error: "#b91c1c",
      },
      "#ffffff",
    ),
    dark: withChrome(
      {
        primary: "#f8fafc",
        secondary: "#94a3b8",
        accent: "#60a5fa",
        background: "#020617",
        foreground: "#f8fafc",
        surface: "#0f172a",
        card: "#111827",
        border: "#1e293b",
        muted: "#94a3b8",
        success: "#4ade80",
        warning: "#fbbf24",
        error: "#f87171",
      },
      "#020617",
    ),
  },
  {
    id: "blush",
    name: "Soft blush",
    description: "Gentle and stylish — nice for beauty and lifestyle.",
    preview: ["#9d174d", "#db2777", "#fdf8f9"],
    light: withChrome(
      {
        primary: "#9d174d",
        secondary: "#57534e",
        accent: "#db2777",
        background: "#fdf8f9",
        foreground: "#1c1917",
        surface: "#ffffff",
        card: "#ffffff",
        border: "#eadde2",
        muted: "#78716c",
        success: "#15803d",
        warning: "#b45309",
        error: "#be123c",
      },
      "#ffffff",
    ),
    dark: withChrome(
      {
        primary: "#f472b6",
        secondary: "#a8a29e",
        accent: "#fb7185",
        background: "#1a1014",
        foreground: "#fdf8f9",
        surface: "#26151c",
        card: "#301b24",
        border: "#4a2a36",
        muted: "#a8a29e",
        success: "#4ade80",
        warning: "#fbbf24",
        error: "#fb7185",
      },
      "#1a1014",
    ),
  },
  {
    id: "slate",
    name: "Cool slate",
    description: "Neutral and professional — works for most stores.",
    preview: ["#0f766e", "#475569", "#f1f5f9"],
    light: withChrome(
      {
        primary: "#0f766e",
        secondary: "#475569",
        accent: "#ea580c",
        background: "#f1f5f9",
        foreground: "#0f172a",
        surface: "#ffffff",
        card: "#ffffff",
        border: "#dce3eb",
        muted: "#64748b",
        success: "#15803d",
        warning: "#b45309",
        error: "#b91c1c",
      },
      "#ffffff",
    ),
    dark: withChrome(
      {
        primary: "#2dd4bf",
        secondary: "#94a3b8",
        accent: "#fb923c",
        background: "#0b1218",
        foreground: "#eef2f7",
        surface: "#121a22",
        card: "#18222c",
        border: "#2a3642",
        muted: "#94a3b8",
        success: "#4ade80",
        warning: "#fbbf24",
        error: "#f87171",
      },
      "#0b1218",
    ),
  },
];

export function findMatchingThemePackId(
  light: ColorTokens,
  dark: ColorTokens,
): string | null {
  for (const pack of THEME_COLOR_PACKS) {
    if (
      pack.light.primary === light.primary &&
      pack.light.background === light.background &&
      pack.dark.primary === dark.primary &&
      pack.dark.background === dark.background
    ) {
      return pack.id;
    }
  }
  return null;
}
