"use client";

import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type AdminToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  /** `row` = full-width bordered row layout used on settings pages */
  variant?: "default" | "row";
};

/** Reusable admin on/off control (MUI Switch + label). */
export function AdminToggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
  variant = "default",
}: AdminToggleProps) {
  if (variant === "row") {
    return (
      <label
        className={cn(
          "flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-snug text-[var(--color-foreground)]">
            {label}
          </span>
          {description ? (
            <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-muted)]">
              {description}
            </span>
          ) : null}
        </span>
        <Switch
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          color="primary"
          size="small"
          disabled={disabled}
          className="!ml-0 shrink-0"
        />
      </label>
    );
  }

  return (
    <div className={className}>
      <FormControlLabel
        disabled={disabled}
        control={
          <Switch
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            color="primary"
            size="small"
          />
        }
        label={
          description ? (
            <span className="flex flex-col gap-0.5">
              <span className="text-sm text-[var(--color-foreground)]">
                {label}
              </span>
              <span className="text-xs text-[var(--color-muted)]">
                {description}
              </span>
            </span>
          ) : (
            label
          )
        }
      />
    </div>
  );
}
