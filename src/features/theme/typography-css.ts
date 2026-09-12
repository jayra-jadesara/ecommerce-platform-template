/**
 * Face tokens (next/font) vs semantic roles (--font-sans / --font-display).
 * Admin stores a CSS stack or face var; the document maps that onto semantic roles.
 */

export const FONT_FACE_VARS = {
  dm_sans: "var(--font-dm-sans)",
  fraunces: "var(--font-fraunces)",
  jetbrains_mono: "var(--font-jetbrains-mono)",
  playfair: "var(--font-playfair)",
  cormorant: "var(--font-cormorant)",
  libre_baskerville: "var(--font-libre-baskerville)",
  outfit: "var(--font-outfit)",
  plus_jakarta: "var(--font-plus-jakarta)",
  manrope: "var(--font-manrope)",
  lora: "var(--font-lora)",
  space_grotesk: "var(--font-space-grotesk)",
  syne: "var(--font-syne)",
} as const;

const LEGACY_ROLE_TO_FACE: Record<string, string> = {
  "var(--font-sans)": FONT_FACE_VARS.dm_sans,
  "var(--font-display)": FONT_FACE_VARS.fraunces,
  "var(--font-mono)": FONT_FACE_VARS.jetbrains_mono,
};

export type TypographyFontRole = "sans" | "display" | "mono";

const ROLE_DEFAULTS: Record<TypographyFontRole, string> = {
  sans: FONT_FACE_VARS.dm_sans,
  display: FONT_FACE_VARS.fraunces,
  mono: FONT_FACE_VARS.jetbrains_mono,
};

/**
 * Normalize a stored font CSS value so it never self-references a semantic role
 * on <html> (legacy DB rows used var(--font-sans) meaning DM Sans).
 */
export function normalizeStoredFontCss(
  value: string | undefined | null,
  role: TypographyFontRole = "sans",
): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return ROLE_DEFAULTS[role];
  return LEGACY_ROLE_TO_FACE[raw] ?? raw;
}

/** CSS custom properties for semantic font roles, ready for <html style>. */
export function typographyCssVars(typography: {
  fontSans?: string;
  fontDisplay?: string;
  fontMono?: string;
}): Record<string, string> {
  return {
    "--font-sans": normalizeStoredFontCss(typography.fontSans, "sans"),
    "--font-display": normalizeStoredFontCss(
      typography.fontDisplay,
      "display",
    ),
    "--font-mono": normalizeStoredFontCss(typography.fontMono, "mono"),
  };
}
