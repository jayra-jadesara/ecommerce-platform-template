import type { StockStatus } from "@/features/catalog/stock";

/** Client-safe inventory list / history types (no server-only imports). */

export type InventoryListStockFilter =
  | "ALL"
  | "LOW"
  | "OUT"
  | "OK"
  | "UNTRACKED";

export type AdminInventoryRow = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  trackInventory: boolean;
  quantity: number;
  reservedQuantity: number;
  available: number;
  lowStockThreshold: number;
  status: StockStatus | "UNTRACKED";
};

export type AdminInventoryProductGroup = {
  productId: string;
  productName: string;
  productSlug: string;
  variants: AdminInventoryRow[];
};

export type InventoryStatusCounts = {
  all: number;
  out: number;
  low: number;
  ok: number;
  untracked: number;
};

export type InventoryListResult = {
  items: AdminInventoryProductGroup[];
  total: number;
  page: number;
  pageSize: number;
  storeLowStockThreshold: number;
  storeCountStock: boolean;
  statusCounts: InventoryStatusCounts;
};

export type InventoryMovementRow = {
  id: string;
  movementType: "SALE" | "RESTOCK" | "REVERSAL" | "ADJUSTMENT";
  quantityDelta: number;
  quantityAfter: number | null;
  reason: string | null;
  createdAt: string;
};
