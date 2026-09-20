import "server-only";

import { writePaymentAudit } from "@/features/payments/audit";
import {
  assertPaymentTransition,
  canTransitionPaymentStatus,
} from "@/features/payments/state-machine";
import type { PaymentInstrument } from "@/features/payments/razorpay-instrument";
import { finalizePaidOrder } from "@/features/orders/finalize";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { PaymentStatus } from "@/types/database";

function asMetadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
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
  instrument?: PaymentInstrument | null;
  clearCustomerCart?: boolean;
}): Promise<{ ok: true; status: PaymentStatus } | { ok: false; error: string }> {
  const supabase = createSupabaseServiceClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, provider_payment_id, metadata")
    .eq("id", input.paymentId)
    .maybeSingle();

  if (!payment) {
    return { ok: false, error: "Payment not found." };
  }

  // Idempotent path: still ensure order inventory finalization ran.
  if (payment.status === "CAPTURED") {
    if (input.instrument) {
      const existing = asMetadataRecord(payment.metadata);
      await supabase
        .from("payments")
        .update({
          payment_method: input.paymentMethod ?? null,
          metadata: {
            ...existing,
            instrument: input.instrument,
          },
        })
        .eq("id", input.paymentId);
    }
    await finalizePaidOrder({
      paymentId: input.paymentId,
      orderId: input.orderId,
      storeId: input.storeId,
      userId: input.userId,
      clearCart: input.clearCustomerCart !== false,
    });
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
  const existingMeta = asMetadataRecord(payment.metadata);
  const nextMeta = input.instrument
    ? { ...existingMeta, instrument: input.instrument }
    : existingMeta;

  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      status: input.targetStatus,
      provider_payment_id: input.providerPaymentId,
      payment_method: input.paymentMethod ?? null,
      paid_at: paidAt,
      failure_reason: null,
      metadata: nextMeta,
    })
    .eq("id", input.paymentId)
    .in("status", ["CREATED", "PENDING", "AUTHORIZED"]);

  if (paymentError) {
    return { ok: false, error: "Unable to update payment." };
  }

  const finalized = await finalizePaidOrder({
    paymentId: input.paymentId,
    orderId: input.orderId,
    storeId: input.storeId,
    userId: input.userId,
    clearCart:
      input.clearCustomerCart !== false && input.targetStatus === "CAPTURED",
  });

  if (!finalized.ok) {
    return { ok: false, error: finalized.error };
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
      inventoryShortages: finalized.inventoryShortages,
      paymentMethod: input.paymentMethod ?? null,
      instrumentMethod: input.instrument?.method ?? null,
    },
  });

  return { ok: true, status: input.targetStatus };
}
