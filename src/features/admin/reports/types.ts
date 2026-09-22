/** Shared DTOs for admin management reports (PDF download, not stored). */

export type ReportRange = {
  key: string;
  days: number;
  from: string;
  to: string;
  /** Human label e.g. "1 Sep 2026 – 22 Sep 2026" */
  label: string;
};

export type ReportDayPoint = {
  day: string;
  label: string;
  placed: number;
  paid: number;
  delivered: number;
  revenue: number;
};

export type ReportProductRow = {
  productId: string;
  name: string;
  units: number;
  revenue: number;
};

export type ReportStatusCount = {
  status: string;
  label: string;
  count: number;
};

export type ReportInventoryRow = {
  productName: string;
  variantName: string;
  sku: string;
  available: number;
  threshold: number;
};

export type ReportReviewStats = {
  total: number;
  pending: number;
  approved: number;
  avgRating: number | null;
  byRating: Array<{ rating: number; count: number }>;
  byProduct: Array<{
    productId: string;
    name: string;
    count: number;
    avgRating: number;
  }>;
};

/** Full payload passed from server page → client PDF builders. */
export type AdminReportBundle = {
  range: ReportRange;
  currency: string;
  revenue: {
    placed: number;
    paid: number;
    delivered: number;
    revenue: number;
    profit: number;
    profitHasCostData: boolean;
    ordersByDay: ReportDayPoint[];
  };
  products: ReportProductRow[];
  fulfillment: {
    byStatus: ReportStatusCount[];
    totalInRange: number;
    cancelled: number;
    refunded: number;
    cancelRate: number;
    refundRate: number;
  };
  inventory: {
    outOfStock: ReportInventoryRow[];
    lowStock: ReportInventoryRow[];
  };
  customersReviews: {
    paidBuyers: number;
    guestPaidOrders: number;
    reviews: ReportReviewStats;
  };
};

export type ReportPdfBrand = {
  brandName: string;
  brandTagline?: string;
  logoUrl?: string;
  colors: import("@/types/config").ColorTokens;
};

export type BuiltReportPdf = {
  blob: Blob;
  filename: string;
};
