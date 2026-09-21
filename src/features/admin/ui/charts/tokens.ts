import type { CSSProperties } from "react";

/**
 * Admin chart colors — theme CSS variables only.
 * Hex accents (teal/blue/purple) were removed so charts follow store branding.
 */
export const ADMIN_CHART_COLORS = {
  primary: "var(--color-primary)",
  primarySoft:
    "color-mix(in srgb, var(--color-primary) 72%, var(--color-foreground) 8%)",
  primaryHover:
    "color-mix(in srgb, var(--color-primary) 78%, var(--color-foreground) 22%)",

  success: "var(--color-success)",
  successHover:
    "color-mix(in srgb, var(--color-success) 78%, var(--color-foreground) 22%)",

  accent: "var(--color-accent)",
  accentHover:
    "color-mix(in srgb, var(--color-accent) 78%, var(--color-foreground) 22%)",

  warning: "var(--color-warning)",
  warningHover:
    "color-mix(in srgb, var(--color-warning) 78%, var(--color-foreground) 22%)",

  secondary: "var(--color-secondary)",
  secondaryHover:
    "color-mix(in srgb, var(--color-secondary) 78%, var(--color-foreground) 22%)",

  muted: "var(--color-muted)",
  mutedHover:
    "color-mix(in srgb, var(--color-muted) 70%, var(--color-foreground) 30%)",

  border: "var(--color-border)",
  card: "var(--color-card)",
  foreground: "var(--color-foreground)",
  grid: "var(--color-border)",

  /** @deprecated Prefer success — kept so older call sites stay theme-aligned. */
  teal: "var(--color-success)",
  tealHover:
    "color-mix(in srgb, var(--color-success) 78%, var(--color-foreground) 22%)",
  /** @deprecated Prefer secondarySoft mixes. */
  blue: "color-mix(in srgb, var(--color-primary) 35%, var(--color-secondary))",
  blueHover:
    "color-mix(in srgb, var(--color-primary) 50%, var(--color-secondary))",
  purple: "color-mix(in srgb, var(--color-primary) 55%, var(--color-accent))",
  purpleHover:
    "color-mix(in srgb, var(--color-primary) 70%, var(--color-accent))",
  amber: "var(--color-accent)",
  amberHover:
    "color-mix(in srgb, var(--color-accent) 78%, var(--color-foreground) 22%)",
  slate: "var(--color-muted)",
} as const;

export const ADMIN_CHART_PALETTE = [
  ADMIN_CHART_COLORS.primary,
  ADMIN_CHART_COLORS.success,
  ADMIN_CHART_COLORS.accent,
  ADMIN_CHART_COLORS.secondary,
  ADMIN_CHART_COLORS.warning,
  ADMIN_CHART_COLORS.muted,
] as const;

export const ADMIN_CHART_HOVER_PALETTE = [
  ADMIN_CHART_COLORS.primaryHover,
  ADMIN_CHART_COLORS.successHover,
  ADMIN_CHART_COLORS.accentHover,
  ADMIN_CHART_COLORS.secondaryHover,
  ADMIN_CHART_COLORS.warningHover,
  ADMIN_CHART_COLORS.mutedHover,
] as const;

export const adminChartTooltipStyle: CSSProperties = {
  borderRadius: 12,
  border:
    "1px solid color-mix(in srgb, var(--color-border) 70%, var(--color-primary) 30%)",
  background:
    "color-mix(in srgb, var(--color-card) 82%, var(--color-foreground) 18%)",
  color: "var(--color-foreground)",
  fontSize: 12,
  padding: "8px 12px",
  boxShadow:
    "0 12px 32px color-mix(in srgb, #000 45%, transparent)",
};

export const adminChartAxisTick = {
  fontSize: 10,
  fill: "var(--color-muted)",
} as const;

/** Single-line label for chart axes — full value stays in tooltip / title. */
export function truncateChartLabel(value: string, maxChars = 18): string {
  const text = value.trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}
