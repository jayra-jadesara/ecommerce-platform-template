/**
 * Shared storefront UI class helpers — theme-token based, no hard-coded brand colors.
 */

export function sfBtn(
  variant: "primary" | "secondary" | "ghost" | "outline" | "danger" = "primary",
): string {
  const base =
    "sf-motion-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-default,0.5rem)] px-5 py-2.5 text-sm font-semibold tracking-wide transition-[transform,box-shadow,background-color,border-color,filter,opacity] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:pointer-events-none motion-safe:active:scale-[0.98]";

  switch (variant) {
    case "secondary":
    case "outline":
      return `${base} border border-[var(--color-border)] bg-transparent text-[var(--color-foreground)] hover:border-[color-mix(in_srgb,var(--color-primary)_50%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] disabled:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] disabled:text-[color-mix(in_srgb,var(--color-primary)_50%,var(--color-muted))]`;
    case "ghost":
      return `${base} bg-transparent text-[var(--color-foreground)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] disabled:text-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-muted))]`;
    case "danger":
      return `${base} bg-[var(--color-error)] text-white hover:opacity-90 disabled:bg-[color-mix(in_srgb,var(--color-error)_55%,var(--color-border))] disabled:text-white/90`;
    default:
      return `${base} bg-[var(--color-primary)] text-[var(--color-button-foreground)] shadow-[0_8px_20px_color-mix(in_srgb,var(--color-primary)_28%,transparent)] hover:brightness-[1.05] disabled:bg-[color-mix(in_srgb,var(--color-button-background)_55%,var(--color-border))] disabled:text-[color-mix(in_srgb,var(--color-button-foreground)_88%,transparent)] disabled:shadow-none`;
  }
}

export function sfSectionInner(): string {
  return "mx-auto w-full max-w-[var(--layout-content-max,1520px)] pl-[var(--layout-container-padding)] pr-[max(var(--layout-container-padding),var(--sf-dev-edge-clearance,0px))]";
}

export function sfCard(): string {
  return "rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)]";
}

export function sfEyebrow(): string {
  return "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]";
}

export function sfDisplay(): string {
  return "font-[family-name:var(--font-display)] font-semibold tracking-tight text-[var(--color-foreground)]";
}

/** Shared account Orders / Payments data grid shell */
export function sfAccountGridWrap(): string {
  return `${sfCard()} hidden overflow-x-auto md:block !rounded-[var(--radius-default,0.75rem)] !p-0`;
}

export function sfAccountGridTable(): string {
  return "min-w-full border-collapse text-left text-sm";
}

export function sfAccountGridThead(): string {
  return "bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]";
}

export function sfAccountGridTh(align: "left" | "right" = "left"): string {
  return align === "right"
    ? "border border-[var(--color-border)] px-4 py-3 text-right font-semibold"
    : "border border-[var(--color-border)] px-4 py-3 font-semibold";
}

export function sfAccountGridTr(): string {
  return "bg-[var(--color-card)] hover:bg-[color-mix(in_srgb,var(--color-primary)_4%,var(--color-card))]";
}

export function sfAccountGridTd(align: "left" | "right" = "left"): string {
  return align === "right"
    ? "border border-[var(--color-border)] px-4 py-3 align-middle text-right"
    : "border border-[var(--color-border)] px-4 py-3 align-middle";
}
