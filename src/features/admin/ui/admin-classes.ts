/**
 * Admin design tokens & class helpers — Phase 21.2 visual system.
 * Soft surfaces, strong hierarchy, controlled spacing. Theme-token based.
 */

import type { CSSProperties } from "react";

export function adminAppBg(): string {
  return "bg-[color-mix(in_srgb,var(--color-background)_92%,var(--color-surface)_8%)]";
}

/** Fallback only — gradient + motif come from `.admin-sidebar` in admin.css */
export function adminSidebarBg(): string {
  return "bg-transparent";
}

export function adminCard(className = ""): string {
  return [
    "admin-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function adminCardPadding(): string {
  return "p-5 md:p-6";
}

export function adminSectionTitle(): string {
  return "text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]";
}

export function adminSectionDesc(): string {
  return "mt-1 text-sm leading-relaxed text-[var(--color-muted)]";
}

export function adminFormStack(compact = false): string {
  return compact ? "admin-form-stack admin-form-stack--compact" : "admin-form-stack";
}

export function adminFormGrid(): string {
  return "admin-form-stack admin-fields-grid admin-fields-grid--2-md";
}

/** Field grids for admin forms. Use 3 on wide settings pages. */
export function adminFieldsGrid(cols: 1 | 2 | 3 = 2): string {
  if (cols === 3) {
    return "admin-fields-grid admin-fields-grid--2 admin-fields-grid--3-xl";
  }
  if (cols === 2) {
    return "admin-fields-grid admin-fields-grid--2";
  }
  return "admin-fields-grid";
}

export function adminFieldGroup(compact = false): string {
  return compact
    ? "admin-field-group admin-field-group--compact"
    : "admin-field-group";
}

/** Inline style guarantee for vertical rhythm (survives CSS-layer / cache issues). */
export const adminStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
  width: "100%",
};

export function adminPageStack(): string {
  return "flex flex-col gap-6";
}

/** Two cards side-by-side from lg; use adminCardSpanFull() for full-width rows. */
export function adminCardsGrid(): string {
  return "admin-cards-grid";
}

export function adminCardSpanFull(): string {
  return "admin-cards-grid__full";
}

export function adminBtn(
  variant: "primary" | "secondary" | "outline" | "ghost" | "danger" = "primary",
): string {
  const base =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:pointer-events-none";
  switch (variant) {
    case "secondary":
    case "outline":
      return `${base} border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-surface)] disabled:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] disabled:text-[color-mix(in_srgb,var(--color-primary)_50%,var(--color-muted))]`;
    case "ghost":
      return `${base} bg-transparent text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] hover:text-[var(--color-foreground)] disabled:text-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-muted))]`;
    case "danger":
      return `${base} bg-[var(--color-error)] text-[var(--color-button-foreground)] hover:opacity-90 disabled:bg-[color-mix(in_srgb,var(--color-error)_55%,var(--color-border))] disabled:text-[color-mix(in_srgb,var(--color-button-foreground)_88%,transparent)]`;
    default:
      return `${base} bg-[var(--color-button-background)] text-[var(--color-button-foreground)] shadow-sm disabled:bg-[color-mix(in_srgb,var(--color-button-background)_55%,var(--color-border))] disabled:text-[color-mix(in_srgb,var(--color-button-foreground)_88%,transparent)] disabled:shadow-none`;
  }
}

export function adminScrollHide(): string {
  return "admin-scroll-hide";
}

export function adminNavSectionLabel(): string {
  return "px-3.5 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)] first:pt-2";
}

export function adminTopBar(): string {
  return "flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 backdrop-blur-md sm:px-5 lg:px-6";
}
