import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { listAdminOrders } from "@/features/orders/queries";
import type { OrderListItem } from "@/features/orders/types";

/** Successful payments only — failed checkouts still create order rows. */
const CAPTURED = "CAPTURED" as const;

export type AdminDashboardStats = {
  orderCount: number;
  productCount: number;
  /** Sum of grand_total for CAPTURED payments only. */
  revenueMajor: number;
  /**
   * Gross profit: paid revenue minus product cost (variant cost_price × qty).
   * Missing cost prices count as 0.
   */
  profitMajor: number;
  /** True when at least one sold line had a cost price set. */
  profitHasCostData: boolean;
  currency: string;
  recentOrders: OrderListItem[];
};

/**
 * Overview metrics for the admin dashboard (store-scoped).
 * Orders / revenue / recent list use CAPTURED payments only.
 */
export async function getAdminDashboardStats(
  storeId: string | null,
): Promise<AdminDashboardStats> {
  const empty: AdminDashboardStats = {
    orderCount: 0,
    productCount: 0,
    revenueMajor: 0,
    profitMajor: 0,
    profitHasCostData: false,
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
        paymentStatus: CAPTURED,
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

  const storeOrders = storeOrdersRes.data ?? [];
  let revenueMajor = 0;
  let profitMajor = 0;
  let profitHasCostData = false;
  const paidIds = new Set<string>();

  if (storeOrders.length > 0) {
    const orderIds = storeOrders.map((o) => o.id);
    const { data: payments } = await supabase
      .from("payments")
      .select("order_id")
      .in("order_id", orderIds)
      .eq("status", CAPTURED);

    for (const payment of payments ?? []) {
      if (payment.order_id) paidIds.add(payment.order_id);
    }

    for (const order of storeOrders) {
      if (paidIds.has(order.id)) {
        revenueMajor += Number(order.grand_total) || 0;
      }
    }

    const paidOrderIds = [...paidIds];
    if (paidOrderIds.length) {
      const { data: items } = await supabase
        .from("order_items")
        .select("variant_id, quantity")
        .in("order_id", paidOrderIds);

      const variantIds = [
        ...new Set(
          (items ?? [])
            .map((row) => row.variant_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      const costByVariant = new Map<string, number>();
      if (variantIds.length) {
        const { data: variants } = await supabase
          .from("product_variants")
          .select("id, cost_price")
          .in("id", variantIds);
        for (const variant of variants ?? []) {
          if (variant.cost_price != null) {
            costByVariant.set(variant.id, Number(variant.cost_price) || 0);
            profitHasCostData = true;
          }
        }
      }

      let cogs = 0;
      for (const item of items ?? []) {
        if (!item.variant_id) continue;
        const unitCost = costByVariant.get(item.variant_id);
        if (unitCost == null) continue;
        cogs += unitCost * (Number(item.quantity) || 0);
      }
      profitMajor = revenueMajor - cogs;
    }
  }

  return {
    orderCount: ordersResult.total,
    productCount: productsCountRes.count ?? 0,
    revenueMajor,
    profitMajor,
    profitHasCostData,
    currency:
      ordersResult.items[0]?.currency ??
      storeOrders.find((o) => o.currency)?.currency ??
      settingsRes.data?.currency ??
      "INR",
    recentOrders: ordersResult.items,
  };
}
