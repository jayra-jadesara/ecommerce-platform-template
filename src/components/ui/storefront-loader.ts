export const STOREFRONT_LOADER_STYLES = [
  "spinner",
  "ring",
  "dots",
  "pulse",
  "bars",
  "dual",
  "orbit",
  "wave",
  "bloom",
  "dash",
] as const;

export type StorefrontLoaderStyle = (typeof STOREFRONT_LOADER_STYLES)[number];

export const DEFAULT_STOREFRONT_LOADER_STYLE: StorefrontLoaderStyle = "spinner";
export const DEFAULT_STOREFRONT_LOADER_LABEL = "Loading…";

export const STOREFRONT_LOADER_STYLE_META: Record<
  StorefrontLoaderStyle,
  { label: string; hint: string }
> = {
  spinner: { label: "Spinner", hint: "Classic circular progress" },
  ring: { label: "Ring", hint: "Thin brand ring" },
  dots: { label: "Dots", hint: "Three bouncing dots" },
  pulse: { label: "Pulse", hint: "Soft pulsing orb" },
  bars: { label: "Bars", hint: "Equalizer bars" },
  dual: { label: "Dual", hint: "Concentric counter-spin" },
  orbit: { label: "Orbit", hint: "Dot circling a core" },
  wave: { label: "Wave", hint: "Five-dot sine wave" },
  bloom: { label: "Bloom", hint: "Expanding soft rings" },
  dash: { label: "Dash", hint: "Dashed premium arc" },
};

export function coerceStorefrontLoaderStyle(
  value: unknown,
): StorefrontLoaderStyle {
  if (
    typeof value === "string" &&
    (STOREFRONT_LOADER_STYLES as readonly string[]).includes(value)
  ) {
    return value as StorefrontLoaderStyle;
  }
  return DEFAULT_STOREFRONT_LOADER_STYLE;
}

export function coerceStorefrontLoaderLabel(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return DEFAULT_STOREFRONT_LOADER_LABEL;
  return text.slice(0, 40);
}
