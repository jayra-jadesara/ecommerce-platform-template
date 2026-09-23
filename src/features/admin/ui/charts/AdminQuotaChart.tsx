"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ADMIN_CHART_COLORS,
} from "@/features/admin/ui/charts/tokens";
import { AdminChartTooltip } from "@/features/admin/ui/charts/AdminChartTooltip";
import {
  formatBytes,
  quotaLevel,
  quotaPercent,
  type QuotaLevel,
} from "@/features/platform-usage/plan-limits";

type AdminQuotaChartProps = {
  used: number;
  limit: number;
  /** Axis / series label for the used portion. */
  usedLabel?: string;
  remainingLabel?: string;
  height?: number;
  /** When true, treat values as byte sizes (default). Set false for counts. */
  asBytes?: boolean;
  formatValue?: (value: number) => string;
};

function colorForLevel(level: QuotaLevel): string {
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
 * Used vs free-left quota meter (theme Recharts).
 * Works for storage bytes or simple counts.
 */
export function AdminQuotaChart({
  used,
  limit,
  usedLabel = "Used",
  remainingLabel = "Free left",
  height = 72,
  asBytes = true,
  formatValue,
}: AdminQuotaChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const fmt =
    formatValue ??
    ((v: number) => (asBytes ? formatBytes(v) : String(Math.round(v))));

  const level = quotaLevel(used, limit);
  const pct = quotaPercent(used, limit);
  const safeUsed = Math.max(0, used);
  const remaining = Math.max(0, limit - safeUsed);
  const usedColor = colorForLevel(level);
  const remainColor = ADMIN_CHART_COLORS.muted;

  const data = useMemo(
    () => [
      {
        name: "quota",
        used: safeUsed,
        remaining,
      },
    ],
    [safeUsed, remaining],
  );

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[12px] font-semibold text-[var(--color-foreground)]">
          {fmt(safeUsed)}
          <span className="font-normal text-[var(--color-muted)]">
            {" "}
            of {fmt(limit)}
          </span>
        </p>
        <p
          className="text-[11px] font-semibold tabular-nums"
          style={{ color: usedColor }}
        >
          {pct >= 100 ? "100%+" : `${pct.toFixed(0)}%`} used
        </p>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
          barCategoryGap={0}
        >
          <CartesianGrid
            stroke={ADMIN_CHART_COLORS.grid}
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, Math.max(limit, safeUsed, 1)]}
            hide
          />
          <YAxis type="category" dataKey="name" hide width={0} />
          <Tooltip
            cursor={{ fill: "transparent" }}
            content={
              <AdminChartTooltip
                formatter={(value, name) => {
                  const label =
                    name === "used"
                      ? usedLabel
                      : name === "remaining"
                        ? remainingLabel
                        : String(name);
                  return [fmt(Number(value)), label];
                }}
              />
            }
          />
          <Bar
            dataKey="used"
            stackId="q"
            name="used"
            maxBarSize={28}
            radius={[6, 0, 0, 6]}
            onMouseEnter={() => setActiveKey("used")}
            onMouseLeave={() => setActiveKey(null)}
          >
            <Cell
              fill={
                activeKey === "used"
                  ? ADMIN_CHART_COLORS.primaryHover
                  : usedColor
              }
            />
          </Bar>
          <Bar
            dataKey="remaining"
            stackId="q"
            name="remaining"
            maxBarSize={28}
            radius={[0, 6, 6, 0]}
            onMouseEnter={() => setActiveKey("remaining")}
            onMouseLeave={() => setActiveKey(null)}
          >
            <Cell
              fill={
                activeKey === "remaining"
                  ? ADMIN_CHART_COLORS.mutedHover
                  : remainColor
              }
              fillOpacity={0.35}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-[var(--color-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ backgroundColor: usedColor }}
          />
          {usedLabel} ({fmt(safeUsed)})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-sm bg-[var(--color-muted)] opacity-40"
          />
          {remainingLabel} ({fmt(remaining)})
        </span>
      </div>
    </div>
  );
}
