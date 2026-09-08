import "server-only";

import { writeOrderActivity, writeOrderAudit } from "@/features/orders/activity";
import {
  recordInventoryAudit,
  restoreOrderInventory,
} from "@/features/orders/inventory";
import { getOrderDetail } from "@/features/orders/queries";
import { assertOrderTransition } from "@/features/orders/state-machine";
import type { OrderMutationResult } from "@/features/orders/types";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Database, OrderStatus } from "@/types/database";

export async function updateOrderStatus(input: {
  orderId: string;
  storeId: string;
  actorUserId: string;
  nextStatus: OrderStatus;
  shippingProvider?: string | null;
  trackingNumber?: string | null;
}): Promise<OrderMutationResult> {
  const supabase = createSupabaseServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", input.orderId)
    .eq("store_id", input.storeId)
    .maybeSingle();

  if (!order) {
    return { ok: false, error: "Order not found." };
  }

  try {
    assertOrderTransition(order.status, input.nextStatus);
  } catch {
    return {
      ok: false,
      error: `Cannot change status from ${order.status} to ${input.nextStatus}.`,
    };
  }

  const patch: Database["public"]["Tables"]["orders"]["Update"] = {
    status: input.nextStatus,
  };

  if (input.nextStatus === "SHIPPED") {
    patch.shipped_at = new Date().toISOString();
    if (input.shippingProvider !== undefined) {
      patch.shipping_provider = input.shippingProvider || null;
    }
    if (input.trackingNumber !== undefined) {
      patch.tracking_number = input.trackingNumber || null;
    }
  }
  if (input.nextStatus === "DELIVERED") {
    patch.delivered_at = new Date().toISOString();
  }
  if (input.nextStatus === "CANCELLED") {
    patch.cancelled_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", order.id)
    .eq("status", order.status);

  if (error) {
    return { ok: false, error: "Unable to update order status." };
  }

  if (input.nextStatus === "CANCELLED" || input.nextStatus === "REFUNDED") {
    const restored = await restoreOrderInventory(order.id);
    if (restored.ok && !restored.alreadyRestored && !restored.nothingToRestore) {
      await recordInventoryAudit({
        storeId: input.storeId,
        userId: input.actorUserId,
        orderId: order.id,
        action: "INVENTORY_RESTORED",
      });
    }
  }

  await writeOrderActivity({
    orderId: order.id,
    storeId: input.storeId,
    actorUserId: input.actorUserId,
    eventType: "ORDER_STATUS_CHANGED",
    message: `Status changed to ${input.nextStatus}`,
    metadata: {
      from: order.status,
      to: input.nextStatus,
      shippingProvider: input.shippingProvider ?? null,
      trackingNumber: input.trackingNumber ?? null,
    },
  });

  await writeOrderAudit({
    storeId: input.storeId,
    userId: input.actorUserId,
    action:
      input.nextStatus === "CANCELLED"
        ? "ORDER_CANCELLED"
        : "ORDER_STATUS_CHANGED",
    entityId: order.id,
    metadata: { from: order.status, to: input.nextStatus },
  });

  const detail = await getOrderDetail({
    orderId: order.id,
    storeId: input.storeId,
    asAdmin: true,
  });

  if (!detail) {
    return { ok: false, error: "Order updated but could not be reloaded." };
  }

  return {
    ok: true,
    order: detail,
    message: `Order marked as ${input.nextStatus.toLowerCase()}.`,
  };
}

export async function updateOrderTracking(input: {
  orderId: string;
  storeId: string;
  actorUserId: string;
  shippingProvider: string;
  trackingNumber: string;
}): Promise<OrderMutationResult> {
  const supabase = createSupabaseServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", input.orderId)
    .eq("store_id", input.storeId)
    .maybeSingle();

  if (!order) return { ok: false, error: "Order not found." };

  const { error } = await supabase
    .from("orders")
    .update({
      shipping_provider: input.shippingProvider.trim() || null,
      tracking_number: input.trackingNumber.trim() || null,
    })
    .eq("id", order.id);

  if (error) return { ok: false, error: "Unable to save tracking." };

  await writeOrderActivity({
    orderId: order.id,
    storeId: input.storeId,
    actorUserId: input.actorUserId,
    eventType: "TRACKING_UPDATED",
    message: "Shipping tracking updated",
    metadata: {
      shippingProvider: input.shippingProvider,
      trackingNumber: input.trackingNumber,
    },
  });

  const detail = await getOrderDetail({
    orderId: order.id,
    storeId: input.storeId,
    asAdmin: true,
  });
  if (!detail) return { ok: false, error: "Unable to reload order." };
  return { ok: true, order: detail, message: "Tracking saved." };
}

/**
 * Refund foundation — marks order/payment as REFUNDED after admin confirmation.
 * Does not call Razorpay Refund API in this phase (documented limitation).
 * Restores inventory idempotently.
 */
export async function markOrderRefundedLocally(input: {
  orderId: string;
  storeId: string;
  actorUserId: string;
  note?: string;
}): Promise<OrderMutationResult> {
  const result = await updateOrderStatus({
    orderId: input.orderId,
    storeId: input.storeId,
    actorUserId: input.actorUserId,
    nextStatus: "REFUNDED",
  });

  if (!result.ok) return result;

  const supabase = createSupabaseServiceClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, status")
    .eq("order_id", input.orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (payment && payment.status === "CAPTURED") {
    await supabase
      .from("payments")
      .update({ status: "REFUNDED" })
      .eq("id", payment.id)
      .eq("status", "CAPTURED");
  }

  await writeOrderAudit({
    storeId: input.storeId,
    userId: input.actorUserId,
    action: "ORDER_REFUND_INITIATED",
    entityId: input.orderId,
    metadata: {
      note: input.note ?? null,
      providerRefund: false,
      message:
        "Local refund state only — provider refund API not executed in this phase.",
    },
  });

  const detail = await getOrderDetail({
    orderId: input.orderId,
    storeId: input.storeId,
    asAdmin: true,
  });
  if (!detail) return { ok: false, error: "Unable to reload order." };
  return {
    ok: true,
    order: detail,
    message:
      "Order marked refunded locally. Provider payout refund was not sent automatically.",
  };
}
