"use client";

import { cn } from "@/lib/cn";

type AdminToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Visible label next to the switch (compact rows). */
  label?: string;
  /** Optional supporting line under the label. */
  description?: string;
  /** Full-width bordered row (settings / featured). */
  variant?: "inline" | "row";
  className?: string;
  id?: string;
};

/**
 * Theme-safe on/off control for Admin.
 * Avoids MUI Switch + Tailwind geometry clashes that render as a solid red blob.
 */
export function AdminToggle({
  checked,
  onChange,
  disabled,
  label,
  description,
  variant = "inline",
  className,
  id,
}: AdminToggleProps) {
  const switchEl = (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
        checked
          ? "bg-[var(--color-primary)]"
          : "bg-[color-mix(in_srgb,var(--color-muted)_35%,var(--color-border))]",
        disabled && "opacity-60",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-5",
        )}
      />
    </span>
  );

  if (variant === "row") {
    return (
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
          disabled
            ? "cursor-not-allowed border-[var(--color-border)] opacity-55"
            : checked
              ? "border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-card))]"
              : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[color-mix(in_srgb,var(--color-foreground)_18%,var(--color-border))]",
          className,
        )}
      >
        <span className="min-w-0 flex-1">
          {label ? (
            <span className="block text-sm font-semibold text-[var(--color-foreground)]">
              {label}
            </span>
          ) : null}
          {description ? (
            <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-muted)]">
              {description}
            </span>
          ) : null}
        </span>
        {switchEl}
      </button>
    );
  }

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg text-left transition-opacity",
        disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
        className,
      )}
    >
      {switchEl}
      {label || description ? (
        <span className="min-w-0">
          {label ? (
            <span className="block text-sm font-medium text-[var(--color-foreground)]">
              {label}
            </span>
          ) : null}
          {description ? (
            <span className="block text-xs text-[var(--color-muted)]">
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
}
