import "server-only";

import { getCurrentUser } from "@/features/auth/session";
import {
  customerFacingError,
  logPaymentError,
} from "@/features/error-monitoring/logger";
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
    const logged = await logPaymentError({
      message: "Client provider order ID mismatch",
      source: "PROVIDER",
      severity: "CRITICAL",
      operation: "VERIFY_PAYMENT",
      storeId: order.store_id,
      userId: user.id,
      userLogin: user.email,
      orderId: payment.order_id,
      paymentId: payment.id,
      providerOrderId: payment.provider_order_id,
      errorCode: "ORDER_ID_MISMATCH",
      route: "/checkout",
    });
    return {
      ok: false,
      ...customerFacingError(logged.referenceId, true),
      code: "ORDER_ID_MISMATCH",
      referenceId: logged.referenceId,
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
    const logged = await logPaymentError({
      message: "Checkout signature verification failed",
      source: "PROVIDER",
      severity: "CRITICAL",
      operation: "VERIFY_PAYMENT",
      storeId: order.store_id,
      userId: user.id,
      userLogin: user.email,
      orderId: payment.order_id,
      paymentId: payment.id,
      providerOrderId: payment.provider_order_id,
      providerPaymentId: input.razorpayPaymentId,
      errorCode: "SIGNATURE_INVALID",
      route: "/checkout",
    });
    return {
      ok: false,
      ...customerFacingError(logged.referenceId, true),
      code: "SIGNATURE_INVALID",
      referenceId: logged.referenceId,
    };
  }

  let providerPayment;
  try {
    providerPayment = await provider.fetchPayment(input.razorpayPaymentId);
  } catch (fetchError) {
    const logged = await logPaymentError({
      message:
        fetchError instanceof Error
          ? fetchError.message
          : "Provider payment fetch failed",
      error: fetchError,
      source: "PROVIDER",
      severity: "ERROR",
      operation: "VERIFY_PAYMENT",
      storeId: order.store_id,
      userId: user.id,
      userLogin: user.email,
      orderId: payment.order_id,
      paymentId: payment.id,
      providerPaymentId: input.razorpayPaymentId,
      errorCode: "PROVIDER_FETCH_FAILED",
      route: "/checkout",
    });
    return {
      ok: false,
      ...customerFacingError(logged.referenceId, true),
      code: "PROVIDER_FETCH_FAILED",
      referenceId: logged.referenceId,
    };
  }

  if (providerPayment.providerOrderId !== payment.provider_order_id) {
    await markPaymentFailed({
      paymentId: payment.id,
      storeId: order.store_id,
      userId: user.id,
      reason: "Provider order mismatch.",
    });
    const logged = await logPaymentError({
      message: "Provider order mismatch during verification",
      source: "PROVIDER",
      severity: "CRITICAL",
      operation: "VERIFY_PAYMENT",
      storeId: order.store_id,
      userId: user.id,
      userLogin: user.email,
      orderId: payment.order_id,
      paymentId: payment.id,
      providerOrderId: payment.provider_order_id,
      providerPaymentId: input.razorpayPaymentId,
      errorCode: "PROVIDER_ORDER_MISMATCH",
      route: "/checkout",
    });
    return {
      ok: false,
      ...customerFacingError(logged.referenceId, true),
      code: "PROVIDER_ORDER_MISMATCH",
      referenceId: logged.referenceId,
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
    const logged = await logPaymentError({
      message: "Payment amount or currency mismatch",
      source: "PROVIDER",
      severity: "CRITICAL",
      operation: "VERIFY_PAYMENT",
      storeId: order.store_id,
      userId: user.id,
      userLogin: user.email,
      orderId: payment.order_id,
      paymentId: payment.id,
      providerOrderId: payment.provider_order_id,
      providerPaymentId: input.razorpayPaymentId,
      errorCode: "AMOUNT_MISMATCH",
      route: "/checkout",
      metadata: {
        expectedMinor,
        actualMinor: providerPayment.amountMinor,
        currency: payment.currency,
        providerCurrency: providerPayment.currency,
      },
    });
    return {
      ok: false,
      ...customerFacingError(logged.referenceId, true),
      code: "AMOUNT_MISMATCH",
      referenceId: logged.referenceId,
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
    const logged = await logPaymentError({
      message: fulfilled.error || "Payment fulfillment failed",
      source: "SERVER",
      type: "ORDER",
      severity: "CRITICAL",
      operation: "FINALIZE_ORDER",
      storeId: order.store_id,
      userId: user.id,
      userLogin: user.email,
      orderId: payment.order_id,
      paymentId: payment.id,
      providerPaymentId: input.razorpayPaymentId,
      errorCode: "FULFILLMENT_FAILED",
      route: "/checkout",
    });
    return {
      ok: false,
      ...customerFacingError(logged.referenceId, true),
      code: "FULFILLMENT_FAILED",
      referenceId: logged.referenceId,
    };
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
