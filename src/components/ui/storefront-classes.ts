/**
 * Shared storefront UI class helpers — theme-token based, no hard-coded brand colors.
 */

export function sfBtn(
  variant: "primary" | "secondary" | "ghost" | "outline" | "danger" = "primary",
): string {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-default,0.5rem)] px-5 py-2.5 text-sm font-semibold tracking-wide transition-[transform,box-shadow,background-color,border-color,filter,opacity] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-[0.98]";

  switch (variant) {
    case "secondary":
    case "outline":
      return `${base} border border-[var(--color-border)] bg-transparent text-[var(--color-foreground)] hover:border-[color-mix(in_srgb,var(--color-primary)_50%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]`;
    case "ghost":
      return `${base} bg-transparent text-[var(--color-foreground)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]`;
    case "danger":
      return `${base} bg-[var(--color-error)] text-white hover:opacity-90`;
    default:
      return `${base} bg-[var(--color-primary)] text-[var(--color-button-foreground)] shadow-[0_8px_20px_color-mix(in_srgb,var(--color-primary)_28%,transparent)] hover:brightness-[1.05]`;
  }
}

export function sfSectionInner(): string {
  return "mx-auto w-full max-w-[var(--layout-content-max,1520px)] px-[var(--layout-container-padding)]";
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
