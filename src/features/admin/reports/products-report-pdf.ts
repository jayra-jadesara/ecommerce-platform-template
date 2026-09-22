import {
  createReportDoc,
  drawHeroMetric,
  drawInsightBullets,
  drawPremiumTable,
  drawSectionTitle,
  drawStatRow,
  finalizeReportPages,
} from "@/features/admin/reports/pdf-chrome";
import { drawRankedBarChart } from "@/features/admin/reports/pdf-charts";
import {
  REPORT_LABELS,
  pct,
  productsInsights,
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

export async function buildProductsReportPdf(
  brand: ReportPdfBrand,
  data: AdminReportBundle,
): Promise<BuiltReportPdf> {
  const ctx = await createReportDoc(
    brand,
    "Best-selling products report",
    data.range,
  );
  let y = ctx.contentTop;

  const totalUnits = data.products.reduce((s, p) => s + p.units, 0);
  const totalRev = data.products.reduce((s, p) => s + p.revenue, 0);
  const top = data.products[0];
  const second = data.products[1];

  y = drawHeroMetric(
    ctx,
    y,
    "Units sold (top products)",
    String(totalUnits),
    top ? `Best: ${top.name.slice(0, 36)}` : undefined,
  );

  y = drawStatRow(ctx, y, [
    { label: "Products listed", value: String(data.products.length) },
    {
      label: "Sales from list",
      value: formatPdfMoney(totalRev, data.currency),
      hint: "Line totals",
      tone: "primary",
    },
    {
      label: "Best seller units",
      value: top ? String(top.units) : "—",
      tone: "secondary",
    },
    {
      label: "Best seller sales",
      value: top ? formatPdfMoney(top.revenue, data.currency) : "—",
      tone: "success",
    },
  ]);

  y = drawSectionTitle(ctx, "At a glance", y);
  y = drawInsightBullets(
    ctx,
    y,
    productsInsights({
      topName: top?.name ?? null,
      topUnits: top?.units ?? 0,
      topRevenue: top
        ? formatPdfMoney(top.revenue, data.currency)
        : null,
      secondName: second?.name ?? null,
      secondUnits: second?.units ?? 0,
      topShare:
        top && totalRev > 0 ? pct(top.revenue / totalRev) : null,
    }),
  );

  y = drawSectionTitle(ctx, "Top products by units sold", y);
  y = drawRankedBarChart(
    ctx,
    y,
    data.products.slice(0, 10).map((p) => ({
      label: p.name,
      value: p.units,
    })),
    { maxBars: 10, valueFormatter: (n) => `${n} units` },
  );

  y = drawSectionTitle(ctx, "Full product list", y);
  y = drawPremiumTable(
    ctx,
    y,
    [
      { key: "rank", label: "#", weight: 0.4, align: "right" },
      { key: "name", label: REPORT_LABELS.product, weight: 2.2 },
      { key: "units", label: REPORT_LABELS.units, weight: 0.7, align: "right" },
      { key: "share", label: "Of units", weight: 0.8, align: "right" },
      { key: "revenue", label: REPORT_LABELS.revenue, weight: 1, align: "right" },
    ],
    data.products.map((p, i) => ({
      rank: String(i + 1),
      name: p.name,
      units: String(p.units),
      share: totalUnits > 0 ? pct(p.units / totalUnits) : "—",
      revenue: formatPdfMoney(p.revenue, data.currency),
    })),
    {
      totals: {
        rank: "",
        name: "Total (listed)",
        units: String(totalUnits),
        share: totalUnits > 0 ? "100%" : "—",
        revenue: formatPdfMoney(totalRev, data.currency),
      },
      emptyMessage: "No product sales in this period.",
    },
  );

  finalizeReportPages(ctx);
  const name = slugifyFilename(brand.brandName || "store");
  const filename = `${name}-best-sellers-${data.range.from}_to_${data.range.to}.pdf`;
  return { blob: pdfDocToBlob(ctx.doc), filename };
}

export async function downloadProductsReportPdf(
  brand: ReportPdfBrand,
  data: AdminReportBundle,
): Promise<void> {
  const { blob, filename } = await buildProductsReportPdf(brand, data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
