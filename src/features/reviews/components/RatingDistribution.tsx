"use client";

import { cn } from "@/lib/cn";
import type { RatingDistribution } from "@/features/reviews/types";

const DOT_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  5: "bg-[color-mix(in_srgb,var(--color-accent)_92%,#fde68a)]",
  4: "bg-[color-mix(in_srgb,var(--color-accent)_78%,var(--color-primary)_22%)]",
  3: "bg-[color-mix(in_srgb,var(--color-accent)_55%,var(--color-muted))]",
  2: "bg-[color-mix(in_srgb,var(--color-muted)_70%,var(--color-accent)_30%)]",
  1: "bg-[color-mix(in_srgb,var(--color-muted)_85%,transparent)]",
};

type RatingDistributionBarsProps = {
  distribution: RatingDistribution;
  total: number;
  className?: string;
};

/** 5→1 rows: rating · dot · bar · count (Gopal-style). */
export function RatingDistributionBars({
  distribution,
  total,
  className,
}: RatingDistributionBarsProps) {
  const safeTotal = Math.max(0, total);

  return (
    <ul
      className={cn("w-full max-w-xs space-y-1.5", className)}
      aria-label="Rating breakdown"
    >
      {([5, 4, 3, 2, 1] as const).map((star) => {
        const count = distribution[star] ?? 0;
        const pct = safeTotal > 0 ? Math.round((count / safeTotal) * 100) : 0;
        return (
          <li
            key={star}
            className="grid grid-cols-[0.7rem_0.4rem_1fr_1.1rem] items-center gap-1.5"
          >
            <span className="text-[0.65rem] font-medium tabular-nums text-[var(--color-foreground)]">
              {star}
            </span>
            <span
              className={cn("h-1.5 w-1.5 rounded-full", DOT_COLORS[star])}
              aria-hidden
            />
            <div
              className="h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-foreground)_9%,transparent)]"
              role="presentation"
            >
              <div
                className="h-full rounded-full bg-[color-mix(in_srgb,var(--color-accent)_55%,var(--color-foreground)_10%)] transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-right text-[0.65rem] tabular-nums text-[var(--color-muted)]">
              {count}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
