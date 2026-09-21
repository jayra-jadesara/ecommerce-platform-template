"use client";

import { cn } from "@/lib/cn";

type StarRatingProps = {
  /** Current rating 0–5 (fractional OK for display). */
  value: number;
  /** Max stars (default 5). */
  max?: number;
  size?: "sm" | "md" | "lg";
  /** Interactive input mode. */
  interactive?: boolean;
  onChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  id?: string;
};

const SIZE_CLASS = {
  sm: "text-[0.95rem] leading-none tracking-tight",
  md: "text-[1.15rem] leading-none tracking-tight",
  lg: "text-[1.45rem] leading-none tracking-tight",
} as const;

/** Theme accent gold/yellow for filled stars; muted for empty. */
const STAR_FILLED =
  "text-[var(--color-accent)] drop-shadow-[0_0_0.5px_color-mix(in_srgb,var(--color-accent)_40%,transparent)]";
const STAR_EMPTY =
  "text-[color-mix(in_srgb,var(--color-muted)_42%,transparent)]";

/**
 * Reusable star rating — theme accent (yellow/gold) for filled stars.
 * Display or interactive (click to set 1–max).
 */
export function StarRating({
  value,
  max = 5,
  size = "md",
  interactive = false,
  onChange,
  disabled = false,
  className,
  "aria-label": ariaLabel,
  id,
}: StarRatingProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const filled = Math.round(clamped);
  const label =
    ariaLabel ??
    (interactive
      ? `Rate ${filled} of ${max} stars`
      : `Rating ${clamped.toFixed(1)} of ${max}`);

  if (interactive) {
    return (
      <div
        id={id}
        role="radiogroup"
        aria-label={label}
        className={cn(
          "inline-flex items-center gap-0.5",
          SIZE_CLASS[size],
          disabled && "opacity-50",
          className,
        )}
      >
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1;
          const selected = starValue <= filled;
          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={starValue === filled}
              aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
              disabled={disabled}
              className={cn(
                "rounded-sm p-0.5 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                !disabled && "hover:scale-110",
                selected ? STAR_FILLED : STAR_EMPTY,
              )}
              onClick={() => onChange?.(starValue)}
            >
              <span aria-hidden="true">★</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <p
      id={id}
      className={cn(
        "inline-flex items-center gap-0.5",
        SIZE_CLASS[size],
        className,
      )}
      aria-label={label}
    >
      <span aria-hidden="true" className="inline-flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={i < filled ? STAR_FILLED : STAR_EMPTY}
          >
            ★
          </span>
        ))}
      </span>
    </p>
  );
}
