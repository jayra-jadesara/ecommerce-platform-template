import "server-only";

import { writeOrderActivity, writeOrderAudit } from "@/features/orders/activity";
import {
  recordInventoryAudit,
  restoreOrderInventory,
} from "@/features/orders/inventory";
import { getOrderDetail } from "@/features/orders/queries";
import {
  assertOrderTransition,
  orderStatusLabel,
} from "@/features/orders/state-machine";
import type { OrderMutationResult } from "@/features/orders/types";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Database, OrderStatus } from "@/types/database";

export async function updateOrderStatus(input: {
  orderId: string;
  storeId: string;
  actorUserId?: string | null;
  nextStatus: OrderStatus;
  shippingProvider?: string | null;
  trackingNumber?: string | null;
  autoDelivered?: boolean;
  autoDeliverAfterDays?: number;
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
      error: `This order can’t move from ${orderStatusLabel(order.status)} to ${orderStatusLabel(input.nextStatus)}.`,
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
    return unexpectedFailure({
      type: "ORDER",
      source: "DATABASE",
      operation: "UPDATE_ORDER_STATUS",
      feature: "ORDERS",
      message: error.message || "Unable to update order status",
      error,
      storeId: input.storeId,
      entityType: "order",
      entityId: order.id,
      orderId: order.id,
      route: "/orders",
    });
  }

  if (input.nextStatus === "DELIVERED") {
    const { captureCodPaymentOnDelivered } = await import(
      "@/features/payments/cod-capture"
    );
    await captureCodPaymentOnDelivered({
      orderId: order.id,
      storeId: input.storeId,
      actorUserId: input.actorUserId,
    });
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

  if (input.nextStatus === "CANCELLED") {
    const { error: cancelPayError } = await supabase
      .from("payments")
      .update({
        status: "CANCELLED",
        failure_reason: "Order cancelled.",
      })
      .eq("order_id", order.id)
      .in("status", ["CREATED", "PENDING"]);

    // Fallback when DB check constraint does not yet allow CANCELLED.
    if (cancelPayError) {
      await supabase
        .from("payments")
        .update({
          status: "FAILED",
          failure_reason: "Order cancelled.",
        })
        .eq("order_id", order.id)
        .in("status", ["CREATED", "PENDING"]);
    }
  }

  await writeOrderActivity({
    orderId: order.id,
    storeId: input.storeId,
    actorUserId: input.actorUserId,
    eventType: input.autoDelivered
      ? "ORDER_AUTO_DELIVERED"
      : "ORDER_STATUS_CHANGED",
    message: input.autoDelivered
      ? `Auto-marked delivered after ${input.autoDeliverAfterDays ?? "N"} day(s) since shipment`
      : `Status changed to ${input.nextStatus}`,
    metadata: {
      from: order.status,
      to: input.nextStatus,
      shippingProvider: input.shippingProvider ?? null,
      trackingNumber: input.trackingNumber ?? null,
      autoDelivered: Boolean(input.autoDelivered),
      autoDeliverAfterDays: input.autoDeliverAfterDays ?? null,
    },
  });

  await writeOrderAudit({
    storeId: input.storeId,
    userId: input.actorUserId,
    action:
      input.nextStatus === "CANCELLED"
        ? "ORDER_CANCELLED"
        : input.autoDelivered
          ? "ORDER_AUTO_DELIVERED"
          : "ORDER_STATUS_CHANGED",
    entityId: order.id,
    metadata: {
      from: order.status,
      to: input.nextStatus,
      autoDelivered: Boolean(input.autoDelivered),
    },
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
    message: input.autoDelivered
      ? "Order auto-marked as delivered."
      : `Order marked as ${input.nextStatus.toLowerCase()}.`,
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

  if (error) {
    return unexpectedFailure({
      type: "ORDER",
      source: "DATABASE",
      operation: "UPDATE_ORDER_TRACKING",
      feature: "ORDERS",
      message: error.message || "Unable to save tracking",
      error,
      storeId: input.storeId,
      entityType: "order",
      entityId: order.id,
      orderId: order.id,
      route: "/orders",
    });
  }

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
  const supabaseCheck = createSupabaseServiceClient();
  const { data: refundPolicyItems } = await supabaseCheck
    .from("order_items")
    .select("returns_allowed, return_policy, product_name_snapshot")
    .eq("order_id", input.orderId);

  const blocked = (refundPolicyItems ?? []).filter((item) => {
    if (item.return_policy === "no_replace") return false;
    if (item.return_policy === "no_return_refund" || item.return_policy === "replace_only") {
      return true;
    }
    return item.returns_allowed === false;
  });
  if (blocked.length > 0) {
    const names = blocked
      .map((item) => item.product_name_snapshot)
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
    return {
      ok: false,
      error: names
        ? `No refund/return for this order (${names}). Product policy is final sale.`
        : "No refund/return for this order. Product policy is final sale.",
    };
  }

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
