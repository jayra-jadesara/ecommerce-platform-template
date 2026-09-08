import "server-only";

import { writeOrderActivity, writeOrderAudit } from "@/features/orders/activity";
import {
  parseInventoryRpcResult,
  type InventoryFinalizeResult,
} from "@/features/orders/inventory-result";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type { InventoryFinalizeResult };
export { parseInventoryRpcResult } from "@/features/orders/inventory-result";

export async function finalizeOrderInventory(
  orderId: string,
): Promise<InventoryFinalizeResult> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("finalize_order_inventory", {
    p_order_id: orderId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return parseInventoryRpcResult((data ?? null) as Json);
}

export async function restoreOrderInventory(
  orderId: string,
): Promise<InventoryFinalizeResult> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("restore_order_inventory", {
    p_order_id: orderId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return parseInventoryRpcResult((data ?? null) as Json);
}

export async function recordInventoryAudit(input: {
  storeId: string;
  userId?: string | null;
  orderId: string;
  action: "INVENTORY_DECREMENTED" | "INVENTORY_RESTORED";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await writeOrderAudit({
    storeId: input.storeId,
    userId: input.userId,
    action: input.action,
    entityId: input.orderId,
    metadata: input.metadata,
  });
  await writeOrderActivity({
    orderId: input.orderId,
    storeId: input.storeId,
    actorUserId: input.userId,
    eventType: input.action,
    message:
      input.action === "INVENTORY_DECREMENTED"
        ? "Inventory decremented for order items"
        : "Inventory restored for order items",
    metadata: input.metadata,
  });
}
