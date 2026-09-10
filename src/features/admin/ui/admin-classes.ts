/**
 * Admin design tokens & class helpers — Phase 21.2 visual system.
 * Soft surfaces, strong hierarchy, controlled spacing. Theme-token based.
 */

import type { CSSProperties } from "react";

export function adminAppBg(): string {
  return "bg-[color-mix(in_srgb,var(--color-background)_92%,var(--color-surface)_8%)]";
}

export function adminSidebarBg(): string {
  return "bg-[var(--color-surface)]";
}

export function adminCard(className = ""): string {
  return [
    "rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]",
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

export function adminFormStack(): string {
  return "admin-form-stack";
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

export function adminFieldGroup(): string {
  return "admin-field-group";
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

export function adminBtn(
  variant: "primary" | "secondary" | "outline" | "ghost" | "danger" = "primary",
): string {
  const base =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50";
  switch (variant) {
    case "secondary":
    case "outline":
      return `${base} border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-surface)]`;
    case "ghost":
      return `${base} bg-transparent text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] hover:text-[var(--color-foreground)]`;
    case "danger":
      return `${base} bg-[var(--color-error)] text-white hover:opacity-90`;
    default:
      return `${base} bg-[var(--color-button-background)] text-[var(--color-button-foreground)] shadow-sm`;
  }
}

export function adminScrollHide(): string {
  return "admin-scroll-hide";
}

export function adminNavSectionLabel(): string {
  return "px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)] first:pt-1";
}

export function adminTopBar(): string {
  return "flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 backdrop-blur-md sm:px-5 lg:px-6";
}
