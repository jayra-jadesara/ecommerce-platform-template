"use client";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  id?: string;
  label?: string;
}

export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  disabled = false,
  onChange,
  id = "quantity",
  label = "Quantity",
}: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-lg disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
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
        className="h-11 w-14 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-center text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-lg disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        +
      </button>
    </div>
  );
}
