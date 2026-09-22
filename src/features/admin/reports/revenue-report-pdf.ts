import {
  createReportDoc,
  drawHeroMetric,
  drawInsightBullets,
  drawPremiumTable,
  drawSectionTitle,
  drawStatRow,
  finalizeReportPages,
} from "@/features/admin/reports/pdf-chrome";
import {
  aggregateDaySeries,
  drawGroupedBarChart,
  drawRevenueTrendChart,
} from "@/features/admin/reports/pdf-charts";
import {
  REPORT_LABELS,
  pct,
  revenueInsights,
} from "@/features/admin/reports/report-copy";
import {
  formatPdfMoney,
  pdfDocToBlob,
  slugifyFilename,
} from "@/features/admin/reports/pdf-utils";
import type {
  AdminReportBundle,
  BuiltReportPdf,
  ReportPdfBrand,
} from "@/features/admin/reports/types";

export type { BuiltReportPdf };

export async function buildRevenueReportPdf(
  brand: ReportPdfBrand,
  data: AdminReportBundle,
): Promise<BuiltReportPdf> {
  const ctx = await createReportDoc(
    brand,
    "Revenue & orders report",
    data.range,
  );
  let y = ctx.contentTop;
  const r = data.revenue;

  y = drawHeroMetric(
    ctx,
    y,
    "Money received from paid orders",
    formatPdfMoney(r.revenue, data.currency),
    r.profitHasCostData
      ? `Profit ${formatPdfMoney(r.profit, data.currency)}`
      : `${r.paid} paid orders`,
  );

  y = drawStatRow(ctx, y, [
    {
      label: REPORT_LABELS.paidOrders,
      value: String(r.paid),
      hint: REPORT_LABELS.paymentReceived,
      tone: "primary",
    },
    {
      label: REPORT_LABELS.delivered,
      value: String(r.delivered),
      hint: "Reached the customer",
      tone: "secondary",
    },
    {
      label: REPORT_LABELS.profit,
      value: r.profitHasCostData
        ? formatPdfMoney(r.profit, data.currency)
        : "—",
      hint: r.profitHasCostData
        ? "Revenue − product cost"
        : "Set cost price on products",
      tone: "success",
    },
    {
      label: REPORT_LABELS.avgOrderValue,
      value:
        r.paid > 0
          ? formatPdfMoney(r.revenue / r.paid, data.currency)
          : "—",
      hint: "Per paid order",
    },
  ]);

  y = drawStatRow(ctx, y, [
    {
      label: REPORT_LABELS.ordersReceived,
      value: String(r.placed),
      hint: "All new orders",
    },
    {
      label: REPORT_LABELS.paidShare,
      value: r.placed > 0 ? pct(r.paid / r.placed) : "—",
      hint: "Paid out of all orders",
      tone: "primary",
    },
    {
      label: REPORT_LABELS.deliveredShare,
      value: r.paid > 0 ? pct(r.delivered / r.paid) : "—",
      hint: "Delivered out of paid",
      tone: "secondary",
    },
    { label: REPORT_LABELS.currency, value: data.currency },
  ]);

  const bestDay = [...data.revenue.ordersByDay].sort(
    (a, b) => b.revenue - a.revenue,
  )[0];
  const top = data.products[0];

  y = drawSectionTitle(
    ctx,
    "At a glance",
    y,
    "Simple takeaways for this period",
  );
  y = drawInsightBullets(
    ctx,
    y,
    revenueInsights({
      placed: r.placed,
      paid: r.paid,
      delivered: r.delivered,
      revenueLabel: formatPdfMoney(r.revenue, data.currency),
      profitLabel: r.profitHasCostData
        ? formatPdfMoney(r.profit, data.currency)
        : null,
      aovLabel:
        r.paid > 0
          ? formatPdfMoney(r.revenue / r.paid, data.currency)
          : null,
      topProduct: top
        ? `${top.name} (${top.units} units)`
        : null,
      bestDay:
        bestDay && bestDay.revenue > 0
          ? `${bestDay.label} (${formatPdfMoney(bestDay.revenue, data.currency)})`
          : null,
    }),
  );

  const aggregated = aggregateDaySeries(r.ordersByDay, data.range.days);

  y = drawSectionTitle(
    ctx,
    "Money over time",
    y,
    data.range.days > 14 ? "Grouped for easier reading" : "Day by day",
  );
  y = drawRevenueTrendChart(
    ctx,
    y,
    aggregated.map((row) => ({ label: row.label, value: row.revenue })),
    {
      height: 128,
      valueFormatter: (n) =>
        n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)),
    },
  );

  y = drawSectionTitle(
    ctx,
    "Orders received vs paid",
    y,
    "How many orders came in, and how many were paid",
  );
  y = drawGroupedBarChart(
    ctx,
    y,
    aggregated.map((row) => ({
      label: row.label,
      series1: row.placed,
      series2: row.paid,
    })),
    {
      height: 110,
      legend1: "Orders received",
      legend2: "Paid",
    },
  );

  const activeRows = aggregated.filter(
    (row) => row.placed > 0 || row.paid > 0 || row.revenue > 0,
  );

  y = drawSectionTitle(
    ctx,
    "Days with activity",
    y,
    activeRows.length
      ? `${activeRows.length} day(s) with orders · totals below`
      : "No busy days in this period",
  );
  y = drawPremiumTable(
    ctx,
    y,
    [
      { key: "period", label: REPORT_LABELS.date, weight: 1.2 },
      { key: "placed", label: "Received", weight: 0.7, align: "right" },
      { key: "paid", label: "Paid", weight: 0.7, align: "right" },
      { key: "delivered", label: "Delivered", weight: 0.8, align: "right" },
      { key: "revenue", label: REPORT_LABELS.revenue, weight: 1.2, align: "right" },
      { key: "aov", label: "Avg order", weight: 1, align: "right" },
    ],
    activeRows.map((row) => ({
      period: row.label,
      placed: String(row.placed),
      paid: String(row.paid),
      delivered: String(row.delivered),
      revenue: formatPdfMoney(row.revenue, data.currency),
      aov:
        row.paid > 0
          ? formatPdfMoney(row.revenue / row.paid, data.currency)
          : "—",
    })),
    {
      totals: {
        period: "Total",
        placed: String(r.placed),
        paid: String(r.paid),
        delivered: String(r.delivered),
        revenue: formatPdfMoney(r.revenue, data.currency),
        aov:
          r.paid > 0
            ? formatPdfMoney(r.revenue / r.paid, data.currency)
            : "—",
      },
      emptyMessage: "No order activity in this period.",
    },
  );

  finalizeReportPages(ctx);
  const name = slugifyFilename(brand.brandName || "store");
  const filename = `${name}-revenue-${data.range.from}_to_${data.range.to}.pdf`;
  return { blob: pdfDocToBlob(ctx.doc), filename };
}

export async function downloadRevenueReportPdf(
  brand: ReportPdfBrand,
  data: AdminReportBundle,
): Promise<void> {
  const { blob, filename } = await buildRevenueReportPdf(brand, data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
