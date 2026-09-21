"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ADMIN_CHART_COLORS,
  adminChartAxisTick,
} from "@/features/admin/ui/charts/tokens";
import { AdminChartTooltip } from "@/features/admin/ui/charts/AdminChartTooltip";

export type AdminMultiBarSeries = {
  key: string;
  label: string;
  color: string;
  hoverColor: string;
};

export type AdminMultiBarPoint = {
  label: string;
  [key: string]: string | number;
};

type AdminMultiBarChartProps = {
  data: AdminMultiBarPoint[];
  series: AdminMultiBarSeries[];
  height?: number;
  formatValue?: (value: number, seriesKey: string) => string;
  formatLabel?: (
    label: string,
    point: Record<string, string | number>,
  ) => string;
  maxBarSize?: number;
};

export function AdminMultiBarChart({
  data,
  series,
  height = 220,
  formatValue,
  formatLabel,
  maxBarSize = 18,
}: AdminMultiBarChartProps) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -10, bottom: 4 }}
        >
          <CartesianGrid
            stroke={ADMIN_CHART_COLORS.grid}
            strokeDasharray="3 6"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={adminChartAxisTick}
            tickLine={false}
            axisLine={false}
            minTickGap={16}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={adminChartAxisTick}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{
              fill: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
            }}
            content={({ active, payload, label }) => (
              <AdminChartTooltip
                active={active}
                payload={payload}
                label={label}
                labelFormatter={(raw, rows) => {
                  const point = rows?.[0]?.payload as
                    | Record<string, string | number>
                    | undefined;
                  if (formatLabel && point) {
                    return formatLabel(String(raw ?? ""), point);
                  }
                  return String(raw ?? "");
                }}
                formatter={(value, name) => {
                  const key = String(name);
                  const seriesMeta = series.find((row) => row.key === key);
                  const n = Number(value) || 0;
                  const seriesLabel = seriesMeta?.label ?? key;
                  return [
                    formatValue ? formatValue(n, key) : String(n),
                    seriesLabel,
                  ];
                }}
              />
            )}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--color-muted)" }}
            formatter={(value) =>
              series.find((row) => row.key === value)?.label ?? value
            }
          />
          {series.map((row) => (
            <Bar
              key={row.key}
              dataKey={row.key}
              name={row.key}
              fill={row.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={maxBarSize}
              activeBar={{
                fill: row.hoverColor,
                stroke: "none",
              }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
