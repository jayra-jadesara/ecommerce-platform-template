"use client";

import { cn } from "@/lib/cn";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  id?: string;
  label?: string;
  /** Compact controls for tight mobile bars. */
  size?: "md" | "sm";
}

export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  disabled = false,
  onChange,
  id = "quantity",
  label = "Quantity",
  size = "md",
}: QuantityStepperProps) {
  const compact = size === "sm";

  return (
    <div className="inline-flex shrink-0 items-center gap-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          "flex items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-card)] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          compact ? "h-9 w-9 text-base" : "h-11 w-11 text-lg",
        )}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (!Number.isFinite(next)) return;
          onChange(Math.min(max, Math.max(min, Math.floor(next))));
        }}
        className={cn(
          "rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-center text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          compact ? "h-9 w-10" : "h-11 w-14",
        )}
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(
          "flex items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-card)] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          compact ? "h-9 w-9 text-base" : "h-11 w-11 text-lg",
        )}
      >
        +
      </button>
    </div>
  );
}
