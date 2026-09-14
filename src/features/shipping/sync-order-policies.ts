import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import {
  resolveReturnPolicy,
  type ReturnPolicy,
} from "@/features/shipping/policies";

const OPEN_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

/**
 * Keep open order line policies in sync when product / store return policy changes,
 * so customers can request replace based on the current rule (not a stale checkout snapshot).
 */
export async function syncOrderItemReturnPolicies(input: {
  storeId: string;
  productId?: string;
  /** Resolved policy to write onto matching order lines. */
  policy: ReturnPolicy;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();

  let query = supabase
    .from("order_items")
    .select("id, order_id, product_id, orders!inner(id, store_id, status)")
    .eq("orders.store_id", input.storeId)
    .in("orders.status", [...OPEN_ORDER_STATUSES]);

  if (input.productId) {
    query = query.eq("product_id", input.productId);
  }

  const { data: rows } = await query;
  if (!rows?.length) return;

  const ids = rows.map((row) => row.id);
  await supabase
    .from("order_items")
    .update({
      return_policy: input.policy,
      returns_allowed: input.policy === "no_replace",
    })
    .in("id", ids);
}

/** When Delivery & returns default changes, update lines for products that inherit (null). */
export async function syncInheritedOrderItemReturnPolicies(input: {
  storeId: string;
  storePolicy: ReturnPolicy;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { data: rows } = await supabase
    .from("order_items")
    .select(
      "id, product_id, products!inner(id, return_policy, store_id), orders!inner(id, store_id, status)",
    )
    .eq("orders.store_id", input.storeId)
    .eq("products.store_id", input.storeId)
    .is("products.return_policy", null)
    .in("orders.status", [...OPEN_ORDER_STATUSES]);

  if (!rows?.length) return;
  const ids = rows.map((row) => row.id);
  await supabase
    .from("order_items")
    .update({
      return_policy: input.storePolicy,
      returns_allowed: input.storePolicy === "no_replace",
    })
    .in("id", ids);
}

export async function resolveStoreReturnPolicy(
  storeId: string,
): Promise<ReturnPolicy> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("shipping_settings")
    .select("return_policy")
    .eq("store_id", storeId)
    .maybeSingle();
  return resolveReturnPolicy(null, data?.return_policy);
}
