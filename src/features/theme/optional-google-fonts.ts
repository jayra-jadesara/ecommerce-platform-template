/**
 * Theme faces via one Google Fonts stylesheet — not next/font/google.
 *
 * next/font/google uses a hard 3s timeout per file in `next dev` (with retries),
 * which floods the console and stalls compiles on slow networks / HDDs.
 */

export const FONT_FACE_CSS: Record<string, string> = {
  "--font-dm-sans": "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  "--font-fraunces": "'Fraunces', ui-serif, Georgia, serif",
  "--font-jetbrains-mono": "'JetBrains Mono', ui-monospace, monospace",
  "--font-playfair": "'Playfair Display', ui-serif, Georgia, serif",
  "--font-cormorant": "'Cormorant Garamond', ui-serif, Georgia, serif",
  "--font-libre-baskerville": "'Libre Baskerville', ui-serif, Georgia, serif",
  "--font-outfit": "'Outfit', ui-sans-serif, system-ui, sans-serif",
  "--font-plus-jakarta": "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  "--font-manrope": "'Manrope', ui-sans-serif, system-ui, sans-serif",
  "--font-lora": "'Lora', ui-serif, Georgia, serif",
  "--font-space-grotesk": "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  "--font-syne": "'Syne', ui-sans-serif, system-ui, sans-serif",
};

/** @deprecated Use FONT_FACE_CSS */
export const OPTIONAL_FONT_FACE_CSS = FONT_FACE_CSS;

/** One CSS2 request for all theme faces (non-blocking for compile). */
export const GOOGLE_FONTS_STYLESHEET_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000",
    "family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900",
    "family=JetBrains+Mono:ital,wght@0,100..800;1,100..800",
    "family=Playfair+Display:ital,wght@0,400..700;1,400..700",
    "family=Cormorant+Garamond:wght@400;500;600;700",
    "family=Libre+Baskerville:ital,wght@0,400;0,700;1,400",
    "family=Outfit:wght@100..900",
    "family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800",
    "family=Manrope:wght@200..800",
    "family=Lora:ital,wght@0,400..700;1,400..700",
    "family=Space+Grotesk:wght@300..700",
    "family=Syne:wght@400..800",
  ].join("&") +
  "&display=swap";

/** @deprecated Use GOOGLE_FONTS_STYLESHEET_HREF */
export const OPTIONAL_GOOGLE_FONTS_HREF = GOOGLE_FONTS_STYLESHEET_HREF;
