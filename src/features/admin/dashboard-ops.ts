import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export type AdminDashboardOps = {
  confirmedOrders: number;
  processingOrders: number;
  openReplaceRequests: number;
  pendingReviews: number;
  lowStockVariants: number;
  outOfStockVariants: number;
};

const EMPTY: AdminDashboardOps = {
  confirmedOrders: 0,
  processingOrders: 0,
  openReplaceRequests: 0,
  pendingReviews: 0,
  lowStockVariants: 0,
  outOfStockVariants: 0,
};

/**
 * Actionable store-ops counts for the dashboard work queue.
 * Error logs stay on their own page — not surfaced here.
 */
export async function getAdminDashboardOps(
  storeId: string | null,
): Promise<AdminDashboardOps> {
  if (!storeId?.trim()) return EMPTY;

  const supabase = createSupabaseServiceClient();

  const [
    confirmedRes,
    processingRes,
    replaceRes,
    reviewsRes,
    inventoryRes,
    settingsRes,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "CONFIRMED"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "PROCESSING"),
    supabase
      .from("order_replace_requests")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .in("status", ["REQUESTED", "APPROVED"]),
    supabase
      .from("product_reviews")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "pending"),
    supabase
      .from("inventory")
      .select(
        "quantity, reserved_quantity, product_variants!inner(track_inventory, is_active, products!inner(store_id))",
      )
      .eq("product_variants.products.store_id", storeId)
      .eq("product_variants.is_active", true)
      .eq("product_variants.track_inventory", true),
    supabase
      .from("store_settings")
      .select("inventory_low_stock_threshold")
      .eq("store_id", storeId)
      .maybeSingle(),
  ]);

  const storeThreshold =
    typeof settingsRes.data?.inventory_low_stock_threshold === "number"
      ? settingsRes.data.inventory_low_stock_threshold
      : 5;

  let lowStockVariants = 0;
  let outOfStockVariants = 0;
  if (!inventoryRes.error) {
    for (const row of inventoryRes.data ?? []) {
      const available = Math.max(
        0,
        (Number(row.quantity) || 0) - (Number(row.reserved_quantity) || 0),
      );
      if (available <= 0) outOfStockVariants += 1;
      else if (available <= storeThreshold) lowStockVariants += 1;
    }
  }

  return {
    confirmedOrders: confirmedRes.count ?? 0,
    processingOrders: processingRes.count ?? 0,
    openReplaceRequests: replaceRes.count ?? 0,
    pendingReviews: reviewsRes.count ?? 0,
    lowStockVariants,
    outOfStockVariants,
  };
}
