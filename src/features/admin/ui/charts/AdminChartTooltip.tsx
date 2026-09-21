"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type AdminChartTooltipItem = {
  name?: string;
  value?: ReactNode;
  color?: string;
};

type AdminChartTooltipProps = {
  active?: boolean;
  label?: ReactNode;
  /** Recharts payload rows (name / value / color). */
  payload?: Array<{
    name?: string | number;
    value?: string | number | Array<string | number>;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  /** Optional override for the title line. */
  labelFormatter?: (
    label: ReactNode,
    payload: AdminChartTooltipProps["payload"],
  ) => ReactNode;
  /** Optional override for each value row. */
  formatter?: (
    value: string | number,
    name: string,
    entry: NonNullable<AdminChartTooltipProps["payload"]>[number],
  ) => [ReactNode, ReactNode] | ReactNode;
};

/**
 * Theme-aware chart tooltip — elevated surface, never Recharts’ default black panel.
 */
export function AdminChartTooltip({
  active,
  label,
  payload,
  labelFormatter,
  formatter,
}: AdminChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const title = labelFormatter
    ? labelFormatter(label, payload)
    : label;

  return (
    <div
      className={cn(
        "admin-chart-tooltip min-w-[8.5rem] max-w-[16rem] rounded-xl px-3 py-2",
        "bg-[color-mix(in_srgb,var(--color-card)_82%,var(--color-foreground)_18%)]",
        "border border-[color-mix(in_srgb,var(--color-border)_75%,var(--color-primary)_25%)]",
        "text-[var(--color-foreground)] shadow-[0_12px_32px_color-mix(in_srgb,#000_45%,transparent)]",
      )}
    >
      {title != null && title !== "" ? (
        <p className="mb-1.5 text-[11px] font-semibold leading-snug text-[var(--color-foreground)]">
          {title}
        </p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry, index) => {
          const rawName = String(entry.name ?? "");
          const rawValue = Array.isArray(entry.value)
            ? entry.value[0]
            : entry.value;
          const numericOrString =
            typeof rawValue === "number" || typeof rawValue === "string"
              ? rawValue
              : String(rawValue ?? "");

          let displayValue: ReactNode = numericOrString;
          let displayName: ReactNode = rawName;

          if (formatter) {
            const formatted = formatter(numericOrString, rawName, entry);
            if (Array.isArray(formatted)) {
              displayValue = formatted[0];
              displayName = formatted[1];
            } else {
              displayValue = formatted;
            }
          }

          return (
            <li
              key={`${rawName}-${index}`}
              className="flex items-center justify-between gap-3 text-[11px] leading-snug"
            >
              <span className="inline-flex min-w-0 items-center gap-1.5 text-[var(--color-muted)]">
                {entry.color ? (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                    aria-hidden
                  />
                ) : null}
                <span className="truncate">{displayName}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-[var(--color-foreground)]">
                {displayValue}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
