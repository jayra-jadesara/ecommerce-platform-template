"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type AdminRadioProps = {
  checked: boolean;
  disabled?: boolean;
  className?: string;
  controlClassName?: string;
  size?: "sm" | "md";
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "disabled" | "className" | "size"
>;

/**
 * Theme-aligned radio control (uses --color-primary, not browser/MUI blue).
 * Pair with a wrapping `<label>` for hit area.
 */
export function AdminRadio({
  checked,
  disabled = false,
  className,
  controlClassName,
  size = "md",
  ...inputProps
}: AdminRadioProps) {
  const box = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const dot = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        box,
        className,
      )}
    >
      <input
        {...inputProps}
        type="radio"
        checked={checked}
        disabled={disabled}
        className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none flex items-center justify-center rounded-full border transition",
          box,
          checked
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_16%,transparent)]"
            : "border-[var(--color-border)] bg-[var(--color-card)] peer-hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))]",
          disabled && "opacity-50",
          controlClassName,
        )}
      >
        <span
          className={cn(
            "rounded-full bg-[var(--color-card)] transition",
            dot,
            checked ? "scale-100 opacity-100" : "scale-0 opacity-0",
          )}
        />
      </span>
    </span>
  );
}

export type AdminRadioCardProps<T extends string> = {
  name: string;
  value: T;
  checked: boolean;
  onChange: (value: T) => void;
  label: ReactNode;
  description?: ReactNode;
  /** Small chip next to the title (e.g. access level). */
  badge?: ReactNode;
  disabled?: boolean;
  className?: string;
  /** Tighter padding for long lists (e.g. role picker). */
  dense?: boolean;
};

/** Selectable bordered card with themed radio + title/description. */
export function AdminRadioCard<T extends string>({
  name,
  value,
  checked,
  onChange,
  label,
  description,
  badge,
  disabled = false,
  className,
  dense = false,
}: AdminRadioCardProps<T>) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2 rounded-xl border transition",
        dense ? "px-2 py-1.5" : "gap-2.5 px-2.5 py-2",
        checked
          ? "border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-card))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
          : "border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-surface)]",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      <AdminRadio
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        size={dense ? "sm" : "md"}
        className="mt-0.5"
        onChange={() => onChange(value)}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "font-semibold leading-tight text-[var(--color-foreground)]",
              dense ? "text-[12px]" : "text-[13px]",
            )}
          >
            {label}
          </span>
          {badge ? (
            <span className="rounded-md bg-[color-mix(in_srgb,var(--color-surface)_80%,var(--color-card))] px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.04em] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]">
              {badge}
            </span>
          ) : null}
        </span>
        {description ? (
          <span
            className={cn(
              "mt-0.5 block leading-snug text-[var(--color-muted)]",
              dense ? "text-[10px]" : "text-[11px]",
            )}
          >
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
