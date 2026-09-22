import type { ReportDayPoint } from "@/features/admin/reports/types";
import type { ReportDocContext } from "@/features/admin/reports/pdf-chrome";
import { ensureSpace, sectionGap } from "@/features/admin/reports/pdf-chrome";
import {
  tintRgb,
  type PdfRgb,
  type PdfTheme,
} from "@/features/admin/reports/pdf-utils";

export type BarChartPoint = {
  label: string;
  value: number;
  value2?: number;
};

export type GroupedBarPoint = {
  label: string;
  series1: number;
  series2: number;
};

const MAX_CHART_BARS = 10;

/**
 * Attractive theme chart colors — primary / accent / success / warning
 * plus light tints (never muddy dark-secondary mixes).
 */
export function chartPalette(theme: PdfTheme): PdfRgb[] {
  return [
    theme.primary,
    theme.accent,
    theme.success,
    theme.warning,
    tintRgb(theme.primary, 0.42),
    tintRgb(theme.accent, 0.35),
    tintRgb(theme.success, 0.3),
  ];
}

export function chartColorAt(theme: PdfTheme, index: number): PdfRgb {
  const palette = chartPalette(theme);
  return palette[index % palette.length]!;
}

/** Evenly sample points so charts never exceed maxBars. */
export function sampleChartPoints<T>(points: T[], maxBars = MAX_CHART_BARS): T[] {
  if (points.length <= maxBars) return points;
  if (maxBars <= 1) return points.slice(0, 1);
  const out: T[] = [];
  const last = points.length - 1;
  for (let i = 0; i < maxBars; i += 1) {
    const idx = Math.round((i * last) / (maxBars - 1));
    const item = points[idx];
    if (item !== undefined) out.push(item);
  }
  return out.filter((item, i, arr) => i === 0 || item !== arr[i - 1]);
}

/**
 * Bucket daily series for chart/table readability.
 * ≤14 days: daily · ≤90 days: weekly · longer: monthly.
 */
export function aggregateDaySeries(
  points: ReportDayPoint[],
  rangeDays: number,
): Array<{
  label: string;
  placed: number;
  paid: number;
  delivered: number;
  revenue: number;
}> {
  if (rangeDays <= 14) return points;

  const bucketDays = rangeDays > 90 ? 30 : 7;

  const buckets = new Map<
    string,
    {
      label: string;
      placed: number;
      paid: number;
      delivered: number;
      revenue: number;
      order: number;
    }
  >();

  for (const point of points) {
    const d = new Date(`${point.day}T12:00:00`);
    let key: string;
    let label: string;
    if (bucketDays === 30) {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      label = new Intl.DateTimeFormat("en-IN", {
        month: "short",
        year: "2-digit",
      }).format(d);
    } else {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().slice(0, 10);
      label = new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
      }).format(weekStart);
    }
    const prev = buckets.get(key);
    if (prev) {
      prev.placed += point.placed;
      prev.paid += point.paid;
      prev.delivered += point.delivered;
      prev.revenue += point.revenue;
    } else {
      buckets.set(key, {
        label,
        placed: point.placed,
        paid: point.paid,
        delivered: point.delivered,
        revenue: point.revenue,
        order: buckets.size,
      });
    }
  }
  return [...buckets.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ label, placed, paid, delivered, revenue }) => ({
      label,
      placed,
      paid,
      delivered,
      revenue,
    }));
}

function drawChartFrame(
  ctx: ReportDocContext,
  y: number,
  height: number,
  labelPad: number,
): number {
  const { doc, margin, contentW, theme } = ctx;

  y = ensureSpace(ctx, y, height + labelPad + 16);

  doc.setFillColor(theme.surface.r, theme.surface.g, theme.surface.b);
  doc.setDrawColor(theme.border.r, theme.border.g, theme.border.b);
  doc.roundedRect(margin, y, contentW, height + labelPad, 6, 6, "FD");
  doc.setFillColor(theme.primary.r, theme.primary.g, theme.primary.b);
  doc.rect(margin, y, 3.5, height + labelPad, "F");

  return y + 12;
}

function labelEvery(count: number): number {
  if (count <= 6) return 1;
  if (count <= 10) return 2;
  return Math.ceil(count / 6);
}

/** Revenue trend — solid brand primary bars with a soft tint highlight. */
export function drawRevenueTrendChart(
  ctx: ReportDocContext,
  y: number,
  points: BarChartPoint[],
  options?: {
    height?: number;
    valueFormatter?: (n: number) => string;
  },
): number {
  const { doc, margin, contentW, theme } = ctx;
  const height = options?.height ?? 130;
  const format = options?.valueFormatter ?? ((n: number) => String(n));
  const fill = theme.primary;
  const soft = tintRgb(theme.primary, 0.48);
  const labelPad = 28;
  const slice = sampleChartPoints(points, MAX_CHART_BARS);

  if (!slice.length) {
    y = ensureSpace(ctx, y, 24);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
    doc.text("No revenue in this period.", margin, y);
    return sectionGap(y + 16);
  }

  const chartTop = drawChartFrame(ctx, y, height, labelPad);
  const chartBottom = chartTop + height - 8;
  const chartLeft = margin + 40;
  const chartRight = margin + contentW - 14;
  const chartW = chartRight - chartLeft;

  const max = Math.max(...slice.map((p) => p.value), 1);
  const gridLines = 4;

  doc.setDrawColor(theme.border.r, theme.border.g, theme.border.b);
  doc.setLineWidth(0.3);
  for (let g = 0; g <= gridLines; g += 1) {
    const gy = chartBottom - (g / gridLines) * (height - 20);
    doc.line(chartLeft, gy, chartRight, gy);
    if (g > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
      doc.text(format((max * g) / gridLines), chartLeft - 4, gy + 2, {
        align: "right",
      });
    }
  }

  const gap = Math.max(6, Math.min(12, chartW / (slice.length * 3)));
  const barW = Math.max(
    10,
    Math.min(28, (chartW - gap * (slice.length - 1)) / slice.length),
  );
  const step = labelEvery(slice.length);

  for (let i = 0; i < slice.length; i += 1) {
    const point = slice[i]!;
    const h = (point.value / max) * (height - 28);
    const x = chartLeft + i * (barW + gap);
    const barY = chartBottom - h;

    doc.setFillColor(soft.r, soft.g, soft.b);
    doc.roundedRect(x, barY, barW, Math.max(h, 1), 2, 2, "F");
    doc.setFillColor(fill.r, fill.g, fill.b);
    doc.roundedRect(
      x,
      barY + Math.max(h, 1) * 0.5,
      barW,
      Math.max(h * 0.5, 1),
      2,
      2,
      "F",
    );

    if (i % step === 0 || i === slice.length - 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
      const label =
        point.label.length > 9 ? `${point.label.slice(0, 8)}…` : point.label;
      doc.text(label, x + barW / 2, chartBottom + 14, { align: "center" });
    }
  }

  return sectionGap(chartTop + height + labelPad);
}

/** Grouped bars — soft primary vs accent (clear contrast, on-brand). */
export function drawGroupedBarChart(
  ctx: ReportDocContext,
  y: number,
  points: GroupedBarPoint[],
  options?: {
    height?: number;
    legend1?: string;
    legend2?: string;
    color1?: PdfRgb;
    color2?: PdfRgb;
  },
): number {
  const { doc, margin, contentW, theme } = ctx;
  const height = options?.height ?? 120;
  const labelPad = 28;
  const slice = sampleChartPoints(points, MAX_CHART_BARS);
  const color1 = options?.color1 ?? tintRgb(theme.primary, 0.55);
  const color2 = options?.color2 ?? theme.accent;

  if (!slice.length) {
    y = ensureSpace(ctx, y, 24);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
    doc.text("No order activity in this period.", margin, y);
    return sectionGap(y + 16);
  }

  const chartTop = drawChartFrame(ctx, y, height, labelPad);
  const chartBottom = chartTop + height - 8;
  const chartLeft = margin + 28;
  const chartRight = margin + contentW - 14;
  const chartW = chartRight - chartLeft;

  const max = Math.max(
    ...slice.flatMap((p) => [p.series1, p.series2]),
    1,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setFillColor(color1.r, color1.g, color1.b);
  doc.roundedRect(chartLeft, chartTop - 2, 8, 8, 1, 1, "F");
  doc.setTextColor(theme.foreground.r, theme.foreground.g, theme.foreground.b);
  doc.text(options?.legend1 ?? "Orders received", chartLeft + 12, chartTop + 4);

  doc.setFillColor(color2.r, color2.g, color2.b);
  doc.roundedRect(chartLeft + 100, chartTop - 2, 8, 8, 1, 1, "F");
  doc.setTextColor(theme.foreground.r, theme.foreground.g, theme.foreground.b);
  doc.text(options?.legend2 ?? "Paid", chartLeft + 112, chartTop + 4);

  doc.setDrawColor(theme.border.r, theme.border.g, theme.border.b);
  doc.line(chartLeft, chartBottom, chartRight, chartBottom);

  const groupGap = Math.max(8, Math.min(14, chartW / (slice.length * 2.5)));
  const groupW = Math.max(
    16,
    Math.min(36, (chartW - groupGap * (slice.length - 1)) / slice.length),
  );
  const barW = Math.max(5, (groupW - 3) / 2);
  const step = labelEvery(slice.length);

  for (let i = 0; i < slice.length; i += 1) {
    const point = slice[i]!;
    const gx = chartLeft + i * (groupW + groupGap);
    const h1 = (point.series1 / max) * (height - 28);
    const h2 = (point.series2 / max) * (height - 28);

    doc.setFillColor(color1.r, color1.g, color1.b);
    doc.roundedRect(gx, chartBottom - h1, barW, Math.max(h1, 1), 1, 1, "F");

    doc.setFillColor(color2.r, color2.g, color2.b);
    doc.roundedRect(
      gx + barW + 2,
      chartBottom - h2,
      barW,
      Math.max(h2, 1),
      1,
      1,
      "F",
    );

    if (i % step === 0 || i === slice.length - 1) {
      doc.setFontSize(6.5);
      doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
      const label =
        point.label.length > 9 ? `${point.label.slice(0, 8)}…` : point.label;
      doc.text(label, gx + groupW / 2, chartBottom + 14, { align: "center" });
    }
  }

  return sectionGap(chartTop + height + labelPad);
}

/** Horizontal ranked bars — theme palette (primary → accent → success → …). */
export function drawRankedBarChart(
  ctx: ReportDocContext,
  y: number,
  points: BarChartPoint[],
  options?: {
    maxBars?: number;
    valueFormatter?: (n: number) => string;
  },
): number {
  const { doc, margin, contentW, theme } = ctx;
  const maxBars = options?.maxBars ?? 10;
  const barHeight = 14;
  const slice = points.slice(0, maxBars);

  if (!slice.length) {
    y = ensureSpace(ctx, y, 20);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
    doc.text("No data for this period.", margin, y);
    return sectionGap(y + 14);
  }

  const max = Math.max(...slice.map((p) => p.value), 1);
  const rankW = 18;
  const labelW = 130;
  const trackW = contentW - rankW - labelW - 52;

  for (let i = 0; i < slice.length; i += 1) {
    const point = slice[i]!;
    y = ensureSpace(ctx, y, barHeight + 12);
    const fill = chartColorAt(theme, i);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(theme.muted.r, theme.muted.g, theme.muted.b);
    doc.text(String(i + 1), margin + 4, y + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(theme.foreground.r, theme.foreground.g, theme.foreground.b);
    const name =
      (doc.splitTextToSize(point.label, labelW - 4) as string[])[0] ?? "";
    doc.text(name, margin + rankW, y + 10);

    const barX = margin + rankW + labelW;
    doc.setFillColor(theme.border.r, theme.border.g, theme.border.b);
    doc.roundedRect(barX, y + 1, trackW, barHeight - 2, 2, 2, "F");

    const fillW = Math.max(3, (point.value / max) * trackW);
    doc.setFillColor(fill.r, fill.g, fill.b);
    doc.roundedRect(barX, y + 1, fillW, barHeight - 2, 2, 2, "F");

    doc.setFontSize(7.5);
    doc.setTextColor(theme.foreground.r, theme.foreground.g, theme.foreground.b);
    const format = options?.valueFormatter ?? ((n: number) => String(n));
    doc.text(format(point.value), barX + trackW + 6, y + 10);

    y += barHeight + 8;
  }

  return sectionGap(y);
}

/** @deprecated */
export function drawVerticalBarChart(
  ctx: ReportDocContext,
  y: number,
  points: BarChartPoint[],
  options?: Parameters<typeof drawRevenueTrendChart>[3],
): number {
  return drawRevenueTrendChart(ctx, y, points, options);
}

/** @deprecated */
export function drawHorizontalBarChart(
  ctx: ReportDocContext,
  y: number,
  points: BarChartPoint[],
  options?: Parameters<typeof drawRankedBarChart>[3],
): number {
  return drawRankedBarChart(ctx, y, points, options);
}
