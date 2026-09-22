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
  fulfillmentInsights,
  pct,
} from "@/features/admin/reports/report-copy";
import { pdfDocToBlob, slugifyFilename } from "@/features/admin/reports/pdf-utils";
import type {
  AdminReportBundle,
  BuiltReportPdf,
  ReportPdfBrand,
} from "@/features/admin/reports/types";

export async function buildFulfillmentReportPdf(
  brand: ReportPdfBrand,
  data: AdminReportBundle,
): Promise<BuiltReportPdf> {
  const ctx = await createReportDoc(
    brand,
    "Order fulfillment report",
    data.range,
  );
  let y = ctx.contentTop;
  const f = data.fulfillment;
  const delivered =
    f.byStatus.find((s) => s.status === "DELIVERED")?.count ?? 0;
  const inPipeline =
    (f.byStatus.find((s) => s.status === "CONFIRMED")?.count ?? 0) +
    (f.byStatus.find((s) => s.status === "PROCESSING")?.count ?? 0) +
    (f.byStatus.find((s) => s.status === "SHIPPED")?.count ?? 0);

  y = drawHeroMetric(
    ctx,
    y,
    "Orders in this period",
    String(f.totalInRange),
    `${delivered} delivered · ${inPipeline} waiting`,
  );

  y = drawStatRow(ctx, y, [
    {
      label: REPORT_LABELS.delivered,
      value: String(delivered),
      tone: "success",
    },
    {
      label: REPORT_LABELS.waitingToShip,
      value: String(inPipeline),
      hint: "Confirmed to shipped",
      tone: "warning",
    },
    {
      label: "Cancelled",
      value: String(f.cancelled),
      tone: "error",
    },
    {
      label: "Refunded",
      value: String(f.refunded),
      tone: "secondary",
    },
  ]);

  y = drawStatRow(ctx, y, [
    { label: "Cancel rate", value: pct(f.cancelRate), tone: "error" },
    { label: "Refund rate", value: pct(f.refundRate), tone: "warning" },
    {
      label: "Delivered share",
      value:
        f.totalInRange > 0 ? pct(delivered / f.totalInRange) : "—",
      hint: "Of all orders",
      tone: "success",
    },
  ]);

  y = drawSectionTitle(ctx, "At a glance", y);
  y = drawInsightBullets(
    ctx,
    y,
    fulfillmentInsights({
      inPipeline,
      cancelled: f.cancelled,
      cancelPct: pct(f.cancelRate),
      delivered,
    }),
  );

  y = drawSectionTitle(ctx, "Orders by status", y);
  y = drawRankedBarChart(
    ctx,
    y,
    f.byStatus.map((s) => ({ label: s.label, value: s.count })),
    { maxBars: 8 },
  );

  y = drawSectionTitle(ctx, "Status counts", y);
  y = drawPremiumTable(
    ctx,
    y,
    [
      { key: "status", label: REPORT_LABELS.status, weight: 2 },
      { key: "count", label: "Orders", weight: 0.8, align: "right" },
      { key: "share", label: REPORT_LABELS.share, weight: 0.8, align: "right" },
    ],
    f.byStatus.map((s) => ({
      status: s.label,
      count: String(s.count),
      share:
        f.totalInRange > 0 ? pct(s.count / f.totalInRange) : "—",
    })),
    {
      totals: {
        status: "Total",
        count: String(f.totalInRange),
        share: f.totalInRange > 0 ? "100%" : "—",
      },
    },
  );

  finalizeReportPages(ctx);
  const name = slugifyFilename(brand.brandName || "store");
  const filename = `${name}-fulfillment-${data.range.from}_to_${data.range.to}.pdf`;
  return { blob: pdfDocToBlob(ctx.doc), filename };
}

export async function downloadFulfillmentReportPdf(
  brand: ReportPdfBrand,
  data: AdminReportBundle,
): Promise<void> {
  const { blob, filename } = await buildFulfillmentReportPdf(brand, data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
