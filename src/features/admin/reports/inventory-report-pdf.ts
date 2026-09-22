import {
  createReportDoc,
  drawHeroMetric,
  drawInsightBullets,
  drawPremiumTable,
  drawSectionTitle,
  drawStatRow,
  finalizeReportPages,
} from "@/features/admin/reports/pdf-chrome";
import { inventoryInsights } from "@/features/admin/reports/report-copy";
import { pdfDocToBlob, slugifyFilename } from "@/features/admin/reports/pdf-utils";
import type {
  AdminReportBundle,
  BuiltReportPdf,
  ReportPdfBrand,
} from "@/features/admin/reports/types";

export async function buildInventoryReportPdf(
  brand: ReportPdfBrand,
  data: AdminReportBundle,
): Promise<BuiltReportPdf> {
  const ctx = await createReportDoc(
    brand,
    "Inventory risk report",
    data.range,
  );
  let y = ctx.contentTop;
  const { outOfStock, lowStock } = data.inventory;
  const total = outOfStock.length + lowStock.length;

  y = drawHeroMetric(
    ctx,
    y,
    "Items that need attention",
    String(total),
    "Current stock · not filtered by date",
  );

  y = drawStatRow(ctx, y, [
    {
      label: "Out of stock",
      value: String(outOfStock.length),
      tone: "error",
    },
    {
      label: "Running low",
      value: String(lowStock.length),
      tone: "warning",
    },
  ]);

  y = drawSectionTitle(ctx, "What to do", y);
  y = drawInsightBullets(
    ctx,
    y,
    inventoryInsights({
      outOfStock: outOfStock.length,
      lowStock: lowStock.length,
    }),
  );

  y = drawSectionTitle(ctx, "Out of stock", y);
  y = drawPremiumTable(
    ctx,
    y,
    [
      { key: "product", label: "Product", weight: 1.4 },
      { key: "variant", label: "Size / pack", weight: 1.2 },
      { key: "sku", label: "SKU", weight: 0.8 },
      { key: "available", label: "Left", weight: 0.7, align: "right" },
    ],
    outOfStock.map((row) => ({
      product: row.productName,
      variant: row.variantName,
      sku: row.sku,
      available: String(row.available),
    })),
    { emptyMessage: "All tracked items still have stock." },
  );

  y = drawSectionTitle(ctx, "Running low", y);
  y = drawPremiumTable(
    ctx,
    y,
    [
      { key: "product", label: "Product", weight: 1.3 },
      { key: "variant", label: "Size / pack", weight: 1.1 },
      { key: "sku", label: "SKU", weight: 0.7 },
      { key: "available", label: "Left", weight: 0.6, align: "right" },
      { key: "threshold", label: "Alert at", weight: 0.6, align: "right" },
    ],
    lowStock.map((row) => ({
      product: row.productName,
      variant: row.variantName,
      sku: row.sku,
      available: String(row.available),
      threshold: String(row.threshold),
    })),
    { emptyMessage: "Nothing is below its alert level." },
  );

  finalizeReportPages(ctx);
  const name = slugifyFilename(brand.brandName || "store");
  return {
    blob: pdfDocToBlob(ctx.doc),
    filename: `${name}-inventory-risk.pdf`,
  };
}

export async function downloadInventoryReportPdf(
  brand: ReportPdfBrand,
  data: AdminReportBundle,
): Promise<void> {
  const { blob, filename } = await buildInventoryReportPdf(brand, data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
