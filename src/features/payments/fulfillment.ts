import "server-only";

import { writePaymentAudit } from "@/features/payments/audit";
import {
  assertPaymentTransition,
  canTransitionPaymentStatus,
} from "@/features/payments/state-machine";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { PaymentStatus } from "@/types/database";

async function clearCustomerCartForStore(input: {
  userId: string;
  storeId: string;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { data: carts } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", input.userId)
    .eq("store_id", input.storeId);

  for (const cart of carts ?? []) {
    await supabase.from("cart_items").delete().eq("cart_id", cart.id);
  }
}

export async function markPaymentFailed(input: {
  paymentId: string;
  storeId: string;
  userId?: string | null;
  reason: string;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("status")
    .eq("id", input.paymentId)
    .maybeSingle();

  if (!payment) return;
  if (!canTransitionPaymentStatus(payment.status, "FAILED")) return;

  await supabase
    .from("payments")
    .update({
      status: "FAILED",
      failure_reason: input.reason.slice(0, 500),
    })
    .eq("id", input.paymentId);

  await writePaymentAudit({
    storeId: input.storeId,
    userId: input.userId,
    action: "PAYMENT_FAILED",
    entityType: "payment",
    entityId: input.paymentId,
    metadata: { reason: input.reason.slice(0, 200) },
  });
}

export async function fulfillVerifiedPayment(input: {
  paymentId: string;
  orderId: string;
  storeId: string;
  userId: string;
  targetStatus: "AUTHORIZED" | "CAPTURED";
  providerPaymentId: string;
  paymentMethod?: string | null;
  clearCustomerCart?: boolean;
}): Promise<{ ok: true; status: PaymentStatus } | { ok: false; error: string }> {
  const supabase = createSupabaseServiceClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, provider_payment_id")
    .eq("id", input.paymentId)
    .maybeSingle();

  if (!payment) {
    return { ok: false, error: "Payment not found." };
  }

  if (payment.status === "CAPTURED") {
    return { ok: true, status: "CAPTURED" };
  }

  if (
    payment.provider_payment_id &&
    payment.provider_payment_id !== input.providerPaymentId
  ) {
    return {
      ok: false,
      error: "Payment already linked to another provider payment.",
    };
  }

  try {
    assertPaymentTransition(payment.status, input.targetStatus);
  } catch {
    return { ok: false, error: "Invalid payment state transition." };
  }

  const paidAt = new Date().toISOString();

  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      status: input.targetStatus,
      provider_payment_id: input.providerPaymentId,
      payment_method: input.paymentMethod ?? null,
      paid_at: paidAt,
      failure_reason: null,
    })
    .eq("id", input.paymentId)
    .in("status", ["CREATED", "PENDING", "AUTHORIZED"]);

  if (paymentError) {
    return { ok: false, error: "Unable to update payment." };
  }

  if (input.targetStatus === "CAPTURED" || input.targetStatus === "AUTHORIZED") {
    await supabase
      .from("orders")
      .update({ status: "CONFIRMED" })
      .eq("id", input.orderId)
      .in("status", ["PENDING"]);
  }

  if (
    input.clearCustomerCart !== false &&
    input.targetStatus === "CAPTURED" &&
    input.userId
  ) {
    try {
      await clearCustomerCartForStore({
        userId: input.userId,
        storeId: input.storeId,
      });
    } catch {
      // Best-effort.
    }
  }

  await writePaymentAudit({
    storeId: input.storeId,
    userId: input.userId,
    action: "PAYMENT_VERIFIED",
    entityType: "payment",
    entityId: input.paymentId,
    metadata: {
      status: input.targetStatus,
      orderId: input.orderId,
    },
  });

  return { ok: true, status: input.targetStatus };
}
