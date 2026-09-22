import type {
  AdminReportBundle,
  BuiltReportPdf,
  ReportPdfBrand,
} from "@/features/admin/reports/types";

export const MANAGEMENT_REPORT_OPTIONS = [
  { value: "revenue", label: "Revenue & orders" },
  { value: "products", label: "Best-selling products" },
  { value: "fulfillment", label: "Order fulfillment" },
  { value: "inventory", label: "Inventory risk" },
  { value: "customers", label: "Customers & reviews" },
] as const;

export type ManagementReportKey =
  (typeof MANAGEMENT_REPORT_OPTIONS)[number]["value"];

export const DEFAULT_MANAGEMENT_REPORT: ManagementReportKey | "" = "";

const VALID = new Set<string>(
  MANAGEMENT_REPORT_OPTIONS.map((o) => o.value),
);

export function isManagementReportKey(
  value: string,
): value is ManagementReportKey {
  return VALID.has(value);
}

/** Build any management report as a client-side PDF blob (not stored). */
export async function buildReportPdf(
  report: ManagementReportKey,
  brand: ReportPdfBrand,
  data: AdminReportBundle,
): Promise<BuiltReportPdf> {
  switch (report) {
    case "products": {
      const { buildProductsReportPdf } = await import(
        "@/features/admin/reports/products-report-pdf"
      );
      return buildProductsReportPdf(brand, data);
    }
    case "fulfillment": {
      const { buildFulfillmentReportPdf } = await import(
        "@/features/admin/reports/fulfillment-report-pdf"
      );
      return buildFulfillmentReportPdf(brand, data);
    }
    case "inventory": {
      const { buildInventoryReportPdf } = await import(
        "@/features/admin/reports/inventory-report-pdf"
      );
      return buildInventoryReportPdf(brand, data);
    }
    case "customers": {
      const { buildCustomersReviewsReportPdf } = await import(
        "@/features/admin/reports/customers-reviews-report-pdf"
      );
      return buildCustomersReviewsReportPdf(brand, data);
    }
    case "revenue":
    default: {
      const { buildRevenueReportPdf } = await import(
        "@/features/admin/reports/revenue-report-pdf"
      );
      return buildRevenueReportPdf(brand, data);
    }
  }
}
