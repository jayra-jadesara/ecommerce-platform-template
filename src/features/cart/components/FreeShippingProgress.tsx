"use client";

import { formatMoney } from "@/features/catalog/money";
import { cn } from "@/lib/cn";

export type FreeShippingProgressProps = {
  /** Cart subtotal in major currency units. */
  subtotalMajor: number;
  currency: string;
  /** Free-shipping threshold in major units; null/undefined hides the strip. */
  thresholdMajor: number | null | undefined;
  shippingEnabled?: boolean;
  className?: string;
};

/**
 * Shows remaining amount toward free delivery when shipping is configured.
 */
export function FreeShippingProgress({
  subtotalMajor,
  currency,
  thresholdMajor,
  shippingEnabled = true,
  className,
}: FreeShippingProgressProps) {
  if (!shippingEnabled || thresholdMajor == null || thresholdMajor <= 0) {
    return null;
  }

  const remaining = Math.max(0, thresholdMajor - subtotalMajor);
  const unlocked = remaining <= 0;
  const progress = unlocked
    ? 100
    : Math.min(100, Math.round((subtotalMajor / thresholdMajor) * 100));

  return (
    <div
      className={cn(
        "rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3",
        className,
      )}
      role="status"
    >
      <p className="text-sm font-medium text-[var(--color-foreground)]">
        {unlocked
          ? "Free delivery unlocked"
          : `Add ${formatMoney(remaining, currency)} more to unlock free delivery`}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-border)_80%,transparent)]"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-[var(--color-muted)]">
        Free delivery above {formatMoney(thresholdMajor, currency)}
      </p>
    </div>
  );
}
