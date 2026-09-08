import "server-only";

import { writeCouponAudit } from "@/features/coupons/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type RedeemCouponResult =
  | { ok: true; alreadyRedeemed: boolean }
  | { ok: false; error: string };

/**
 * Redeem a coupon for a paid/finalized order.
 * Idempotent per order_id. Race-safe via DB RPC (row lock + usage counts).
 * Do not call on Apply — only after payment is AUTHORIZED/CAPTURED.
 */
export async function redeemCoupon(input: {
  orderId: string;
  couponId: string;
  userId: string | null;
  discountAmountMajor: number;
  storeId: string;
}): Promise<RedeemCouponResult> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase.rpc("redeem_coupon_for_order", {
    p_order_id: input.orderId,
    p_coupon_id: input.couponId,
    p_user_id: input.userId,
    p_discount_amount: input.discountAmountMajor,
  });

  if (error) {
    return { ok: false, error: error.message || "Unable to redeem coupon." };
  }

  const payload = data as {
    ok?: boolean;
    already_redeemed?: boolean;
    error?: string;
  } | null;

  if (!payload?.ok) {
    return {
      ok: false,
      error: payload?.error ?? "Unable to redeem coupon.",
    };
  }

  if (!payload.already_redeemed) {
    await writeCouponAudit({
      storeId: input.storeId,
      userId: input.userId,
      action: "COUPON_REDEEMED",
      entityId: input.couponId,
      metadata: {
        orderId: input.orderId,
        discountAmount: input.discountAmountMajor,
      } as Json,
    });
  }

  return {
    ok: true,
    alreadyRedeemed: Boolean(payload.already_redeemed),
  };
}
