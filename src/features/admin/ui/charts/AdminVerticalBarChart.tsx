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
  adminChartTooltipStyle,
} from "@/features/admin/ui/charts/tokens";

export type AdminVerticalBarPoint = {
  label: string;
  value: number;
};

type AdminVerticalBarChartProps = {
  data: AdminVerticalBarPoint[];
  height?: number;
  color?: string;
  hoverColor?: string;
  valueLabel?: string;
  formatValue?: (value: number) => string;
  colorful?: boolean;
  maxBarSize?: number;
};

export function AdminVerticalBarChart({
  data,
  height = 200,
  color = ADMIN_CHART_COLORS.primary,
  hoverColor = ADMIN_CHART_COLORS.primaryHover,
  valueLabel = "Count",
  formatValue,
  colorful = false,
  maxBarSize = 32,
}: AdminVerticalBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
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
            contentStyle={adminChartTooltipStyle}
            formatter={(value) => {
              const n = Number(value) || 0;
              return [formatValue ? formatValue(n) : String(n), valueLabel];
            }}
            labelStyle={{ color: "var(--color-muted)", marginBottom: 2 }}
          />
          <Bar
            dataKey="value"
            radius={[5, 5, 0, 0]}
            maxBarSize={maxBarSize}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {data.map((entry, index) => {
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
                  key={`${entry.label}-${index}`}
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
