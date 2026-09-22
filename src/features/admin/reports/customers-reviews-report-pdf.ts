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
  customersInsights,
} from "@/features/admin/reports/report-copy";
import { pdfDocToBlob, slugifyFilename } from "@/features/admin/reports/pdf-utils";
import type {
  AdminReportBundle,
  BuiltReportPdf,
  ReportPdfBrand,
} from "@/features/admin/reports/types";

export async function buildCustomersReviewsReportPdf(
  brand: ReportPdfBrand,
  data: AdminReportBundle,
): Promise<BuiltReportPdf> {
  const ctx = await createReportDoc(
    brand,
    "Customers & reviews report",
    data.range,
  );
  let y = ctx.contentTop;
  const { paidBuyers, guestPaidOrders, reviews } = data.customersReviews;

  y = drawHeroMetric(
    ctx,
    y,
    "Customers who paid",
    String(paidBuyers),
    `${guestPaidOrders} guest checkout(s)`,
  );

  y = drawStatRow(ctx, y, [
    {
      label: "With account",
      value: String(paidBuyers),
      tone: "primary",
    },
    {
      label: "Guest checkouts",
      value: String(guestPaidOrders),
      tone: "secondary",
    },
    {
      label: "Reviews",
      value: String(reviews.total),
      tone: "warning",
    },
    {
      label: "Average rating",
      value: reviews.avgRating != null ? `${reviews.avgRating} / 5` : "—",
      tone: "success",
    },
  ]);

  y = drawStatRow(ctx, y, [
    {
      label: "Waiting for approval",
      value: String(reviews.pending),
      tone: "warning",
    },
    {
      label: "Approved",
      value: String(reviews.approved),
      tone: "success",
    },
  ]);

  y = drawSectionTitle(ctx, "At a glance", y);
  y = drawInsightBullets(
    ctx,
    y,
    customersInsights({
      paidBuyers,
      guestPaid: guestPaidOrders,
      pending: reviews.pending,
      avgRating: reviews.avgRating,
      reviewTotal: reviews.total,
    }),
  );

  y = drawSectionTitle(ctx, "Star ratings", y);
  y = drawRankedBarChart(
    ctx,
    y,
    reviews.byRating.map((row) => ({
      label: `${row.rating} star`,
      value: row.count,
    })),
    { maxBars: 5, valueFormatter: (n) => `${n} reviews` },
  );

  y = drawSectionTitle(ctx, "Most reviewed products", y);
  y = drawPremiumTable(
    ctx,
    y,
    [
      { key: "name", label: REPORT_LABELS.product, weight: 2.2 },
      { key: "count", label: REPORT_LABELS.reviews, weight: 0.8, align: "right" },
      { key: "avg", label: REPORT_LABELS.avgRating, weight: 0.8, align: "right" },
    ],
    reviews.byProduct.map((p) => ({
      name: p.name,
      count: String(p.count),
      avg: `${p.avgRating}★`,
    })),
    {
      emptyMessage: "No product reviews in this period.",
      totals: reviews.byProduct.length
        ? {
            name: "Total",
            count: String(reviews.total),
            avg: reviews.avgRating != null ? `${reviews.avgRating}★` : "—",
          }
        : undefined,
    },
  );

  finalizeReportPages(ctx);
  const name = slugifyFilename(brand.brandName || "store");
  const filename = `${name}-customers-reviews-${data.range.from}_to_${data.range.to}.pdf`;
  return { blob: pdfDocToBlob(ctx.doc), filename };
}

export async function downloadCustomersReviewsReportPdf(
  brand: ReportPdfBrand,
  data: AdminReportBundle,
): Promise<void> {
  const { blob, filename } = await buildCustomersReviewsReportPdf(brand, data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
