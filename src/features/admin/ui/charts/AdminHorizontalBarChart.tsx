"use client";

import { useState } from "react";
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
  ADMIN_CHART_HOVER_PALETTE,
  ADMIN_CHART_PALETTE,
  adminChartAxisTick,
  truncateChartLabel,
} from "@/features/admin/ui/charts/tokens";
import { AdminChartTooltip } from "@/features/admin/ui/charts/AdminChartTooltip";

export type AdminHorizontalBarPoint = {
  /** Full name (shown in tooltip). */
  name: string;
  value: number;
};

type TickProps = {
  x?: number;
  y?: number;
  payload?: { value?: string };
};

function TruncatedYTick({
  x = 0,
  y = 0,
  payload,
  maxChars,
}: TickProps & { maxChars: number }) {
  const full = String(payload?.value ?? "");
  const display = truncateChartLabel(full, maxChars);
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{full}</title>
      <text
        x={-6}
        y={0}
        dy={4}
        textAnchor="end"
        fill="var(--color-muted)"
        fontSize={10}
        style={{ fontFamily: "inherit" }}
      >
        {display}
      </text>
    </g>
  );
}

type AdminHorizontalBarChartProps = {
  data: AdminHorizontalBarPoint[];
  height?: number;
  color?: string;
  hoverColor?: string;
  valueLabel?: string;
  formatValue?: (value: number) => string;
  colorful?: boolean;
  /** Max characters on the Y axis before ellipsis (full name in tooltip). */
  labelMaxChars?: number;
  yAxisWidth?: number;
  maxBarSize?: number;
};

export function AdminHorizontalBarChart({
  data,
  height = 220,
  color = ADMIN_CHART_COLORS.primary,
  hoverColor = ADMIN_CHART_COLORS.primaryHover,
  valueLabel = "Count",
  formatValue,
  colorful = false,
  labelMaxChars = 16,
  yAxisWidth = 108,
  maxBarSize = 14,
}: AdminHorizontalBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = data.map((row) => ({
    ...row,
    axisLabel: truncateChartLabel(row.name, labelMaxChars),
  }));

  const rowGap = Math.max(
    30,
    Math.min(44, Math.floor(height / Math.max(data.length, 1))),
  );
  const computedHeight = Math.max(height, data.length * rowGap + 28);

  return (
    <div className="w-full" style={{ height: computedHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 14, left: 2, bottom: 4 }}
          barCategoryGap="32%"
        >
          <CartesianGrid
            stroke={ADMIN_CHART_COLORS.grid}
            strokeDasharray="3 6"
            horizontal={false}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={adminChartAxisTick}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              const n = Number(value) || 0;
              return formatValue ? formatValue(n) : String(n);
            }}
          />
          <YAxis
            type="category"
            dataKey="axisLabel"
            width={yAxisWidth}
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={(props) => (
              <TruncatedYTick {...props} maxChars={labelMaxChars} />
            )}
          />
          <Tooltip
            cursor={{
              fill: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
            }}
            content={({ active, payload, label }) => (
              <AdminChartTooltip
                active={active}
                payload={payload}
                label={label}
                labelFormatter={(_label, rows) => {
                  const full = rows?.[0]?.payload?.name;
                  return typeof full === "string" ? full : String(_label ?? "");
                }}
                formatter={(value) => {
                  const n = Number(value) || 0;
                  return [
                    formatValue ? formatValue(n) : String(n),
                    valueLabel,
                  ];
                }}
              />
            )}
          />
          <Bar
            dataKey="value"
            radius={[0, 5, 5, 0]}
            maxBarSize={maxBarSize}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {chartData.map((entry, index) => {
              const base = colorful
                ? ADMIN_CHART_PALETTE[index % ADMIN_CHART_PALETTE.length]!
                : color;
              const hover = colorful
                ? ADMIN_CHART_HOVER_PALETTE[
                    index % ADMIN_CHART_HOVER_PALETTE.length
                  ]!
                : hoverColor;
              return (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={activeIndex === index ? hover : base}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
