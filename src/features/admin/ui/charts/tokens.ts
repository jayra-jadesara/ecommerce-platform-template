import type { CSSProperties } from "react";

/** Shared Recharts tokens for Admin UI — theme CSS variables only. */
export const ADMIN_CHART_COLORS = {
  primary: "var(--color-primary)",
  primarySoft:
    "color-mix(in srgb, var(--color-primary) 72%, var(--color-foreground) 8%)",
  primaryHover:
    "color-mix(in srgb, var(--color-primary) 82%, black 12%)",
  teal: "#0d9488",
  tealHover: "#0f766e",
  blue: "#2563eb",
  blueHover: "#1d4ed8",
  purple: "#9333ea",
  purpleHover: "#7e22ce",
  amber: "#d97706",
  amberHover: "#b45309",
  slate: "#64748b",
  muted: "var(--color-muted)",
  border: "var(--color-border)",
  card: "var(--color-card)",
  foreground: "var(--color-foreground)",
  grid: "var(--color-border)",
} as const;

export const ADMIN_CHART_PALETTE = [
  ADMIN_CHART_COLORS.primary,
  ADMIN_CHART_COLORS.teal,
  ADMIN_CHART_COLORS.blue,
  ADMIN_CHART_COLORS.purple,
  ADMIN_CHART_COLORS.amber,
  ADMIN_CHART_COLORS.slate,
] as const;

export const ADMIN_CHART_HOVER_PALETTE = [
  ADMIN_CHART_COLORS.primaryHover,
  ADMIN_CHART_COLORS.tealHover,
  ADMIN_CHART_COLORS.blueHover,
  ADMIN_CHART_COLORS.purpleHover,
  ADMIN_CHART_COLORS.amberHover,
  "#475569",
] as const;

export const adminChartTooltipStyle: CSSProperties = {
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
  color: "var(--color-foreground)",
  fontSize: 12,
  padding: "6px 10px",
  boxShadow:
    "0 8px 20px color-mix(in srgb, var(--color-foreground) 8%, transparent)",
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
