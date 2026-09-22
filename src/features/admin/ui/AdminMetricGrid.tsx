import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type AdminMetricGridCols = 2 | 3 | 4 | 5 | 6;

const COL_CLASS: Record<AdminMetricGridCols, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
};

/**
 * Responsive grid for {@link AdminMetricTile} (and similar KPI tiles).
 * Use on dashboard, reports, and any overview strip.
 */
export function AdminMetricGrid({
  children,
  columns = 4,
  className,
  "aria-label": ariaLabel = "Key metrics",
}: {
  children: ReactNode;
  columns?: AdminMetricGridCols;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn("grid gap-2.5", COL_CLASS[columns], className)}
    >
      {children}
    </section>
  );
}
