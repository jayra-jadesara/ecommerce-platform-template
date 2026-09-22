import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { hasPermission, requirePermission } from "@/features/auth/session";
import { AdminInventoryClient } from "@/features/catalog/components/AdminInventoryClient";
import {
  listAdminInventory,
  type InventoryListStockFilter,
} from "@/features/catalog/inventory-service";

export const dynamic = "force-dynamic";

const STOCK_FILTERS = new Set<InventoryListStockFilter>([
  "ALL",
  "LOW",
  "OUT",
  "OK",
  "UNTRACKED",
]);

function parseStock(value: string | undefined): InventoryListStockFilter {
  if (value && STOCK_FILTERS.has(value as InventoryListStockFilter)) {
    return value as InventoryListStockFilter;
  }
  return "ALL";
}

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    stock?: string;
    product?: string;
  }>;
}) {
  const admin = await requirePermission("inventory.view");
  const storeId = await resolveActiveStoreId();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const rawPageSize = Number(params.pageSize) || 10;
  const pageSize = rawPageSize === 25 ? 25 : 10;
  const stock = parseStock(params.stock);
  const highlightProductId = params.product?.trim() || null;

  const result = await listAdminInventory({
    storeId,
    page,
    pageSize,
    search: params.q ?? "",
    stock,
  });

  return (
    <AdminInventoryClient
      initialGroups={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      initialStock={stock}
      initialSearch={params.q ?? ""}
      storeLowStockThreshold={result.storeLowStockThreshold}
      storeCountStock={result.storeCountStock}
      statusCounts={result.statusCounts}
      highlightProductId={highlightProductId}
      canUpdate={hasPermission(admin, "inventory.update")}
    />
  );
}
