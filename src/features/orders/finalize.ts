import "server-only";

import { writeOrderActivity, writeOrderAudit } from "@/features/orders/activity";
import {
  finalizeOrderInventory,
  recordInventoryAudit,
} from "@/features/orders/inventory";
import { redeemCoupon } from "@/features/coupons/redeem";
import { normalizeCouponCode } from "@/features/coupons/normalize";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export type FinalizePaidOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      alreadyFinalized: boolean;
      inventoryShortages: number;
    }
  | { ok: false; error: string };

/**
 * Idempotent post-payment finalization for an existing PENDING/CONFIRMED order.
 * Phase 12 creates the order before Razorpay; this confirms it, finalizes stock,
 * redeems coupons once, writes activity, and is safe under webhook + browser races.
 */
export async function finalizePaidOrder(input: {
  paymentId: string;
  orderId: string;
  storeId: string;
  userId: string;
  clearCart?: boolean;
}): Promise<FinalizePaidOrderResult> {
  const supabase = createSupabaseServiceClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, order_id")
    .eq("id", input.paymentId)
    .maybeSingle();

  if (!payment || payment.order_id !== input.orderId) {
    return { ok: false, error: "Payment not found for order." };
  }

  if (payment.status !== "CAPTURED" && payment.status !== "AUTHORIZED") {
    return { ok: false, error: "Payment is not confirmed." };
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, inventory_finalized_at, store_id, coupon_code, discount_amount",
    )
    .eq("id", input.orderId)
    .maybeSingle();

  if (!order || order.store_id !== input.storeId) {
    return { ok: false, error: "Order not found." };
  }

  const alreadyFinalized = Boolean(order.inventory_finalized_at);

  if (order.status === "PENDING") {
    await supabase
      .from("orders")
      .update({ status: "CONFIRMED" })
      .eq("id", order.id)
      .eq("status", "PENDING");

    await writeOrderActivity({
      orderId: order.id,
      storeId: input.storeId,
      actorUserId: input.userId,
      eventType: "ORDER_CONFIRMED",
      message: "Payment verified — order confirmed",
      metadata: { paymentId: input.paymentId, paymentStatus: payment.status },
    });
    await writeOrderAudit({
      storeId: input.storeId,
      userId: input.userId,
      action: "ORDER_CREATED",
      entityId: order.id,
      metadata: { paymentId: input.paymentId },
    });
  }

  // Redeem coupon only after payment authority — never on Apply / PENDING create.
  if (order.coupon_code && Number(order.discount_amount) > 0) {
    const code = normalizeCouponCode(order.coupon_code);
    const { data: coupon } = await supabase
      .from("coupons")
      .select("id")
      .eq("store_id", input.storeId)
      .ilike("code", code)
      .limit(1)
      .maybeSingle();

    if (coupon) {
      const redeemed = await redeemCoupon({
        orderId: order.id,
        couponId: coupon.id,
        userId: input.userId,
        discountAmountMajor: Number(order.discount_amount),
        storeId: input.storeId,
      });
      if (!redeemed.ok) {
        await writeOrderActivity({
          orderId: order.id,
          storeId: input.storeId,
          eventType: "COUPON_REDEMPTION_FAILED",
          message: "Coupon could not be redeemed after payment",
          metadata: { error: redeemed.error, code: order.coupon_code },
        });
      } else if (!redeemed.alreadyRedeemed) {
        await writeOrderActivity({
          orderId: order.id,
          storeId: input.storeId,
          eventType: "COUPON_REDEEMED",
          message: `Coupon ${order.coupon_code} redeemed`,
          metadata: {
            discountAmount: Number(order.discount_amount),
            couponId: coupon.id,
          },
        });
      }
    }
  }

  let inventoryShortages = 0;
  if (!alreadyFinalized) {
    const inventory = await finalizeOrderInventory(order.id);
    if (!inventory.ok) {
      await writeOrderActivity({
        orderId: order.id,
        storeId: input.storeId,
        eventType: "INVENTORY_FINALIZATION_FAILED",
        message: inventory.error ?? "Inventory finalization failed",
      });
    } else {
      inventoryShortages = inventory.shortages?.length ?? 0;
      if (!inventory.alreadyFinalized) {
        await recordInventoryAudit({
          storeId: input.storeId,
          userId: input.userId,
          orderId: order.id,
          action: "INVENTORY_DECREMENTED",
          metadata: { shortages: inventory.shortages ?? [] },
        });
      }
      if (inventoryShortages > 0) {
        await writeOrderActivity({
          orderId: order.id,
          storeId: input.storeId,
          eventType: "INVENTORY_SHORTAGE",
          message: "Some items could not be decremented — review stock",
          metadata: { shortages: inventory.shortages ?? [] },
        });
      }
    }
  }

  if (input.clearCart !== false && payment.status === "CAPTURED" && input.userId) {
    const { data: carts } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", input.userId)
      .eq("store_id", input.storeId);
    for (const cart of carts ?? []) {
      await supabase.from("cart_items").delete().eq("cart_id", cart.id);
    }
  }

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number,
    alreadyFinalized,
    inventoryShortages,
  };
}
