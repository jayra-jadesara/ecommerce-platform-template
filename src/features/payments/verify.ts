import "server-only";

import { getCurrentUser } from "@/features/auth/session";
import { writePaymentAudit } from "@/features/payments/audit";
import {
  fulfillVerifiedPayment,
  markPaymentFailed,
} from "@/features/payments/fulfillment";
import { getPaymentProvider } from "@/features/payments/providers";
import type { PaymentActionResult, PaymentVerifyInput } from "@/features/payments/types";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { majorToMinor } from "@/features/pricing/money";

/**
 * Verify Razorpay Checkout handler payload server-side.
 * Uses the SERVER-STORED provider_order_id — never trusts client order id alone.
 */
export async function verifyCheckoutPayment(
  input: PaymentVerifyInput,
): Promise<PaymentActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to confirm payment.", code: "UNAUTHORIZED" };
  }

  const supabase = createSupabaseServiceClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .select(
      "id, order_id, user_id, provider, provider_order_id, provider_payment_id, amount, amount_minor, currency, status, orders!inner(id, store_id, status, currency, grand_total)",
    )
    .eq("id", input.paymentId)
    .maybeSingle();

  if (error || !payment) {
    return { ok: false, error: "Payment not found.", code: "NOT_FOUND" };
  }

  if (payment.user_id !== user.id) {
    return { ok: false, error: "Payment not found.", code: "FORBIDDEN" };
  }

  const order = payment.orders as unknown as {
    id: string;
    store_id: string;
    status: string;
    currency: string;
    grand_total: number;
  };

  if (payment.status === "CAPTURED") {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("order_number")
      .eq("id", payment.order_id)
      .maybeSingle();
    return {
      ok: true,
      paymentId: payment.id,
      orderId: payment.order_id,
      orderNumber: orderRow?.order_number ?? "",
      status: "CAPTURED",
    };
  }

  if (!payment.provider_order_id) {
    return {
      ok: false,
      error: "Payment session is invalid.",
      code: "MISSING_PROVIDER_ORDER",
    };
  }

  if (
    input.razorpayOrderId &&
    input.razorpayOrderId !== payment.provider_order_id
  ) {
    await writePaymentAudit({
      storeId: order.store_id,
      userId: user.id,
      action: "PAYMENT_FAILED",
      entityType: "payment",
      entityId: payment.id,
      metadata: { reason: "client_order_id_mismatch" },
    });
    return {
      ok: false,
      error: "Payment verification failed.",
      code: "ORDER_ID_MISMATCH",
    };
  }

  const provider = getPaymentProvider(payment.provider);
  const signatureOk = provider.verifyCheckoutSignature({
    providerOrderId: payment.provider_order_id,
    providerPaymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureOk) {
    await markPaymentFailed({
      paymentId: payment.id,
      storeId: order.store_id,
      userId: user.id,
      reason: "Signature verification failed.",
    });
    return {
      ok: false,
      error: "Payment verification failed.",
      code: "SIGNATURE_INVALID",
    };
  }

  let providerPayment;
  try {
    providerPayment = await provider.fetchPayment(input.razorpayPaymentId);
  } catch {
    return {
      ok: false,
      error: "Unable to confirm payment with the provider.",
      code: "PROVIDER_FETCH_FAILED",
    };
  }

  if (providerPayment.providerOrderId !== payment.provider_order_id) {
    await markPaymentFailed({
      paymentId: payment.id,
      storeId: order.store_id,
      userId: user.id,
      reason: "Provider order mismatch.",
    });
    return {
      ok: false,
      error: "Payment verification failed.",
      code: "PROVIDER_ORDER_MISMATCH",
    };
  }

  const expectedMinor =
    payment.amount_minor ??
    majorToMinor(Number(payment.amount), payment.currency);

  if (
    providerPayment.amountMinor !== expectedMinor ||
    providerPayment.currency.toUpperCase() !== payment.currency.toUpperCase()
  ) {
    await markPaymentFailed({
      paymentId: payment.id,
      storeId: order.store_id,
      userId: user.id,
      reason: "Amount or currency mismatch.",
    });
    return {
      ok: false,
      error: "Payment verification failed.",
      code: "AMOUNT_MISMATCH",
    };
  }

  const providerStatus = providerPayment.status.toLowerCase();
  if (providerStatus !== "captured" && providerStatus !== "authorized") {
    await markPaymentFailed({
      paymentId: payment.id,
      storeId: order.store_id,
      userId: user.id,
      reason: `Unexpected provider status: ${providerPayment.status}`,
    });
    return {
      ok: false,
      error: "Payment was not completed.",
      code: "NOT_PAID",
    };
  }

  const targetStatus = providerStatus === "captured" ? "CAPTURED" : "AUTHORIZED";

  const fulfilled = await fulfillVerifiedPayment({
    paymentId: payment.id,
    orderId: payment.order_id,
    storeId: order.store_id,
    userId: user.id,
    targetStatus,
    providerPaymentId: input.razorpayPaymentId,
    paymentMethod: providerPayment.method,
    clearCustomerCart: targetStatus === "CAPTURED",
  });

  if (!fulfilled.ok) {
    return { ok: false, error: fulfilled.error, code: "FULFILLMENT_FAILED" };
  }

  if (fulfilled.status === "AUTHORIZED") {
    await supabase
      .from("orders")
      .update({ status: "CONFIRMED" })
      .eq("id", payment.order_id)
      .eq("status", "PENDING");
  }

  const { data: orderRow } = await supabase
    .from("orders")
    .select("order_number")
    .eq("id", payment.order_id)
    .maybeSingle();

  return {
    ok: true,
    paymentId: payment.id,
    orderId: payment.order_id,
    orderNumber: orderRow?.order_number ?? "",
    status: fulfilled.status,
  };
}
