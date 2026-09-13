import "server-only";

import { updateOrderStatus } from "@/features/orders/admin-service";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export type AutoDeliverResult = {
  scanned: number;
  updated: number;
  failed: number;
};

/**
 * Marks SHIPPED orders as DELIVERED when shipped_at is older than the store's
 * auto_deliver_after_days setting. Safe to call opportunistically or via cron.
 */
export async function autoDeliverShippedOrders(input?: {
  storeId?: string | null;
  limit?: number;
}): Promise<AutoDeliverResult> {
  const supabase = createSupabaseServiceClient();
  const limit = Math.min(200, Math.max(1, input?.limit ?? 50));
  const result: AutoDeliverResult = { scanned: 0, updated: 0, failed: 0 };

  let settingsQuery = supabase
    .from("shipping_settings")
    .select("store_id, auto_deliver_after_days, fulfillment_mode")
    .eq("fulfillment_mode", "auto_days")
    .not("auto_deliver_after_days", "is", null);

  if (input?.storeId) {
    settingsQuery = settingsQuery.eq("store_id", input.storeId);
  }

  const { data: settingsRows } = await settingsQuery;
  const stores = (settingsRows ?? []).filter(
    (row) =>
      row.auto_deliver_after_days != null &&
      Number.isFinite(row.auto_deliver_after_days) &&
      row.auto_deliver_after_days >= 1,
  );

  for (const settings of stores) {
    const days = Number(settings.auto_deliver_after_days);
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    const cutoffIso = cutoff.toISOString();

    const { data: orders } = await supabase
      .from("orders")
      .select("id, store_id")
      .eq("store_id", settings.store_id)
      .eq("status", "SHIPPED")
      .not("shipped_at", "is", null)
      .lte("shipped_at", cutoffIso)
      .order("shipped_at", { ascending: true })
      .limit(limit);

    for (const order of orders ?? []) {
      result.scanned += 1;
      const updated = await updateOrderStatus({
        orderId: order.id,
        storeId: order.store_id,
        actorUserId: null,
        nextStatus: "DELIVERED",
        autoDelivered: true,
        autoDeliverAfterDays: days,
      });
      if (updated.ok) result.updated += 1;
      else result.failed += 1;
    }
  }

  return result;
}
