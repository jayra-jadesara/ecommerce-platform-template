import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { listAdminOrders } from "@/features/orders/queries";
import type { OrderListItem } from "@/features/orders/types";

const PAID_PAYMENT_STATUSES = ["CAPTURED", "AUTHORIZED"] as const;

export type AdminDashboardStats = {
  orderCount: number;
  productCount: number;
  /** Sum of grand_total for paid orders (CAPTURED / AUTHORIZED). */
  revenueMajor: number;
  currency: string;
  recentOrders: OrderListItem[];
};

/**
 * Overview metrics for the admin dashboard (store-scoped).
 */
export async function getAdminDashboardStats(
  storeId: string | null,
): Promise<AdminDashboardStats> {
  const empty: AdminDashboardStats = {
    orderCount: 0,
    productCount: 0,
    revenueMajor: 0,
    currency: "INR",
    recentOrders: [],
  };
  if (!storeId?.trim()) return empty;

  const supabase = createSupabaseServiceClient();

  const [ordersResult, productsCountRes, settingsRes, storeOrdersRes] =
    await Promise.all([
      listAdminOrders({
        storeId,
        page: 1,
        pageSize: 5,
        status: "ALL",
      }),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId),
      supabase
        .from("store_settings")
        .select("currency")
        .eq("store_id", storeId)
        .maybeSingle(),
      supabase
        .from("orders")
        .select("id, grand_total, currency")
        .eq("store_id", storeId),
    ]);

  const currency = settingsRes.data?.currency ?? "INR";
  const storeOrders = storeOrdersRes.data ?? [];
  let revenueMajor = 0;

  if (storeOrders.length > 0) {
    const orderIds = storeOrders.map((o) => o.id);
    const { data: payments } = await supabase
      .from("payments")
      .select("order_id, status")
      .in("order_id", orderIds)
      .in("status", [...PAID_PAYMENT_STATUSES]);

    const paidIds = new Set((payments ?? []).map((p) => p.order_id));
    for (const order of storeOrders) {
      if (paidIds.has(order.id)) {
        revenueMajor += Number(order.grand_total) || 0;
      }
    }
  }

  return {
    orderCount: ordersResult.total,
    productCount: productsCountRes.count ?? 0,
    revenueMajor,
    currency:
      storeOrders.find((o) => o.currency)?.currency ?? currency,
    recentOrders: ordersResult.items,
  };
}
