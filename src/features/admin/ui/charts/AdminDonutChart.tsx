"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  ADMIN_CHART_COLORS,
  ADMIN_CHART_HOVER_PALETTE,
  ADMIN_CHART_PALETTE,
} from "@/features/admin/ui/charts/tokens";
import { AdminChartTooltip } from "@/features/admin/ui/charts/AdminChartTooltip";
import {
  quotaLevel,
  quotaPercent,
  type QuotaLevel,
} from "@/features/platform-usage/plan-limits";

export type AdminDonutSegment = {
  name: string;
  value: number;
  /** Optional fixed theme color (CSS var). */
  color?: string;
};

const SPACE_LEFT_COLOR =
  "color-mix(in srgb, var(--color-muted) 22%, var(--color-border))";

type AdminDonutChartProps = {
  data: AdminDonutSegment[];
  /**
   * Total capacity for this meter. When set, unused capacity is drawn as
   * “Space left” so the ring is easy to read (used vs remaining).
   */
  capacity?: number;
  /** Center primary line override (defaults to % used when capacity is set). */
  centerLabel?: string;
  centerSubLabel?: string;
  remainingLabel?: string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  formatValue?: (value: number) => string;
  emptyLabel?: string;
};

function levelColor(level: QuotaLevel): string {
  switch (level) {
    case "ok":
      return ADMIN_CHART_COLORS.success;
    case "warn":
      return ADMIN_CHART_COLORS.warning;
    case "critical":
    case "over":
      return "var(--color-error)";
  }
}

/**
 * Premium theme Recharts donut — used segments + optional Space left capacity.
 */
export function AdminDonutChart({
  data,
  capacity,
  centerLabel,
  centerSubLabel,
  remainingLabel = "Space left",
  height = 248,
  innerRadius = 62,
  outerRadius = 88,
  formatValue = (v) => String(Math.round(v)),
  emptyLabel = "Nothing to show yet.",
}: AdminDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const usedSegments = useMemo(
    () =>
      data
        .map((row) => ({
          name: row.name,
          value: Math.max(0, Number(row.value) || 0),
          color: row.color,
          isRemaining: false as boolean,
        }))
        .filter((row) => row.value > 0),
    [data],
  );

  const usedTotal = useMemo(
    () => usedSegments.reduce((sum, row) => sum + row.value, 0),
    [usedSegments],
  );

  const safeCapacity =
    capacity != null && Number.isFinite(capacity) && capacity > 0
      ? capacity
      : null;

  const remaining =
    safeCapacity != null ? Math.max(0, safeCapacity - usedTotal) : 0;

  const chartData = useMemo(() => {
    const rows = [...usedSegments];
    if (safeCapacity != null && remaining > 0) {
      rows.push({
        name: remainingLabel,
        value: remaining,
        color: SPACE_LEFT_COLOR,
        isRemaining: true,
      });
    }
    return rows;
  }, [usedSegments, safeCapacity, remaining, remainingLabel]);

  const pct =
    safeCapacity != null ? quotaPercent(usedTotal, safeCapacity) : 100;
  const level =
    safeCapacity != null ? quotaLevel(usedTotal, safeCapacity) : "ok";
  const pctColor = safeCapacity != null ? levelColor(level) : ADMIN_CHART_COLORS.primary;

  const resolvedCenterLabel =
    centerLabel ??
    (safeCapacity != null
      ? `${Math.min(100, pct).toFixed(0)}%`
      : formatValue(usedTotal));
  const resolvedCenterSub =
    centerSubLabel ?? (safeCapacity != null ? "used" : "total");

  if (chartData.length === 0 || (usedTotal <= 0 && remaining <= 0)) {
    return (
      <div
        className="flex items-center justify-center text-center text-[12px] text-[var(--color-muted)]"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {safeCapacity != null ? (
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] px-2.5 py-2">
          <div className="min-w-0 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
              Used
            </p>
            <p className="mt-0.5 truncate text-[12px] font-semibold tabular-nums text-[var(--color-foreground)]">
              {formatValue(usedTotal)}
            </p>
          </div>
          <div className="min-w-0 border-x border-[var(--color-border)] text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
              Capacity
            </p>
            <p className="mt-0.5 truncate text-[12px] font-semibold tabular-nums text-[var(--color-foreground)]">
              {formatValue(safeCapacity)}
            </p>
          </div>
          <div className="min-w-0 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
              {remainingLabel}
            </p>
            <p
              className="mt-0.5 truncate text-[12px] font-semibold tabular-nums"
              style={{
                color:
                  remaining > 0
                    ? ADMIN_CHART_COLORS.success
                    : "var(--color-error)",
              }}
            >
              {formatValue(remaining)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="relative" style={{ height: height - (safeCapacity ? 52 : 0) }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={
                <AdminChartTooltip
                  formatter={(value, name) => [
                    formatValue(Number(value)),
                    String(name),
                  ]}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={chartData.length > 1 ? 1.5 : 0}
              stroke="var(--color-card)"
              strokeWidth={3}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {chartData.map((entry, index) => {
                const base =
                  entry.color ??
                  ADMIN_CHART_PALETTE[index % ADMIN_CHART_PALETTE.length];
                const hover = entry.isRemaining
                  ? ADMIN_CHART_COLORS.mutedHover
                  : ADMIN_CHART_HOVER_PALETTE[
                      index % ADMIN_CHART_HOVER_PALETTE.length
                    ];
                return (
                  <Cell
                    key={`${entry.name}-${index}`}
                    fill={activeIndex === index ? hover : base}
                    fillOpacity={entry.isRemaining ? 0.9 : 1}
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <p
            className="text-[22px] font-semibold tabular-nums leading-none tracking-tight"
            style={{ color: pctColor }}
          >
            {resolvedCenterLabel}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
            {resolvedCenterSub}
          </p>
          {safeCapacity != null ? (
            <p className="mt-1.5 max-w-[7.5rem] text-[10px] leading-snug text-[var(--color-muted)]">
              {formatValue(usedTotal)} of {formatValue(safeCapacity)}
            </p>
          ) : null}
        </div>
      </div>

      <ul className="space-y-1.5">
        {chartData.map((entry, index) => {
          const color =
            entry.color ??
            ADMIN_CHART_PALETTE[index % ADMIN_CHART_PALETTE.length];
          const share =
            (safeCapacity != null ? safeCapacity : usedTotal) > 0
              ? (entry.value /
                  (safeCapacity != null ? safeCapacity : usedTotal)) *
                100
              : 0;
          return (
            <li
              key={`${entry.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg px-1 py-0.5 text-[11px]"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-[var(--color-card)]"
                  style={{ backgroundColor: color }}
                />
                <span
                  className={
                    entry.isRemaining
                      ? "font-medium text-[var(--color-muted)]"
                      : "font-medium text-[var(--color-foreground)]"
                  }
                >
                  {entry.name}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-[var(--color-muted)]">
                <span className="font-semibold text-[var(--color-foreground)]">
                  {formatValue(entry.value)}
                </span>
                {" · "}
                {share.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
