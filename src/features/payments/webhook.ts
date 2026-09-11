import "server-only";

import { createHash } from "node:crypto";
import { logPaymentError } from "@/features/error-monitoring/logger";
import { writePaymentAudit } from "@/features/payments/audit";
import {
  fulfillVerifiedPayment,
  markPaymentFailed,
} from "@/features/payments/fulfillment";
import { getPaymentProvider } from "@/features/payments/providers";
import { hasRazorpayWebhookSecret } from "@/features/payments/env";
import {
  canTransitionPaymentStatus,
  preferPaymentStatus,
} from "@/features/payments/state-machine";
import { majorToMinor } from "@/features/pricing/money";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { PaymentStatus } from "@/types/database";
import type { Json } from "@/types/database";

const ALLOWED_EVENTS = new Set([
  "payment.authorized",
  "payment.captured",
  "payment.failed",
  "order.paid",
]);

function digestPayload(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

function mapProviderStatusToPayment(
  eventName: string,
  paymentStatus?: string,
): PaymentStatus | null {
  if (eventName === "payment.failed") return "FAILED";
  if (eventName === "payment.authorized") return "AUTHORIZED";
  if (eventName === "payment.captured" || eventName === "order.paid") {
    return "CAPTURED";
  }
  const status = (paymentStatus ?? "").toLowerCase();
  if (status === "captured") return "CAPTURED";
  if (status === "authorized") return "AUTHORIZED";
  if (status === "failed") return "FAILED";
  return null;
}

/**
 * Process Razorpay webhook after raw-body signature verification.
 * Idempotent via payment_webhook_events unique (provider, event_id).
 */
export async function processRazorpayWebhook(input: {
  rawBody: string;
  signature: string | null;
}): Promise<{ ok: true; ignored?: boolean } | { ok: false; status: number; error: string }> {
  if (!hasRazorpayWebhookSecret()) {
    return { ok: false, status: 503, error: "Webhook secret not configured." };
  }

  if (!input.signature) {
    await logPaymentError({
      message: "Missing Razorpay webhook signature",
      type: "WEBHOOK",
      source: "WEBHOOK",
      severity: "CRITICAL",
      operation: "PROCESS_WEBHOOK",
      errorCode: "WEBHOOK_SIGNATURE_MISSING",
      route: "/api/webhooks/razorpay",
      requestPath: "/api/webhooks/razorpay",
      requestMethod: "POST",
    });
    return { ok: false, status: 400, error: "Missing signature." };
  }

  const provider = getPaymentProvider("razorpay");
  const valid = provider.verifyWebhookSignature({
    rawBody: input.rawBody,
    signature: input.signature,
  });

  if (!valid) {
    await logPaymentError({
      message: "Invalid Razorpay webhook signature",
      type: "WEBHOOK",
      source: "WEBHOOK",
      severity: "CRITICAL",
      operation: "PROCESS_WEBHOOK",
      errorCode: "WEBHOOK_SIGNATURE_INVALID",
      route: "/api/webhooks/razorpay",
      requestPath: "/api/webhooks/razorpay",
      requestMethod: "POST",
    });
    return { ok: false, status: 400, error: "Invalid signature." };
  }

  let payload: {
    event?: string;
    id?: string;
    payload?: {
      payment?: { entity?: Record<string, unknown> };
      order?: { entity?: Record<string, unknown> };
    };
  };

  try {
    payload = JSON.parse(input.rawBody) as typeof payload;
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON." };
  }

  const eventName = payload.event ?? "";
  const eventId = payload.id ?? "";
  if (!eventName || !eventId) {
    return { ok: false, status: 400, error: "Missing event identity." };
  }

  const supabase = createSupabaseServiceClient();
  const payloadDigest = digestPayload(input.rawBody);

  const { data: existing } = await supabase
    .from("payment_webhook_events")
    .select("id, status")
    .eq("provider", "razorpay")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing?.status === "PROCESSED" || existing?.status === "IGNORED") {
    return { ok: true, ignored: true };
  }

  if (!existing) {
    const { error: insertError } = await supabase
      .from("payment_webhook_events")
      .insert({
        provider: "razorpay",
        event_id: eventId,
        event_name: eventName,
        status: "RECEIVED",
        payload_digest: payloadDigest,
        metadata: { event: eventName } as Json,
      });

    // Unique race — treat as already received.
    if (insertError) {
      return { ok: true, ignored: true };
    }
  }

  if (!ALLOWED_EVENTS.has(eventName)) {
    await logPaymentError({
      message: `Unsupported webhook event: ${eventName}`,
      type: "WEBHOOK",
      source: "WEBHOOK",
      severity: "WARNING",
      operation: "PROCESS_WEBHOOK",
      webhookEventId: eventId,
      errorCode: "UNSUPPORTED_WEBHOOK_EVENT",
      route: "/api/webhooks/razorpay",
      requestPath: "/api/webhooks/razorpay",
      requestMethod: "POST",
      metadata: { eventName },
    });
    await supabase
      .from("payment_webhook_events")
      .update({
        status: "IGNORED",
        processed_at: new Date().toISOString(),
      })
      .eq("provider", "razorpay")
      .eq("event_id", eventId);
    return { ok: true, ignored: true };
  }

  const paymentEntity = payload.payload?.payment?.entity;
  const orderEntity = payload.payload?.order?.entity;

  const providerPaymentId =
    typeof paymentEntity?.id === "string" ? paymentEntity.id : null;
  const providerOrderId =
    (typeof paymentEntity?.order_id === "string"
      ? paymentEntity.order_id
      : null) ??
    (typeof orderEntity?.id === "string" ? orderEntity.id : null);

  if (!providerOrderId && !providerPaymentId) {
    await supabase
      .from("payment_webhook_events")
      .update({
        status: "FAILED",
        error_message: "Missing payment/order ids",
        processed_at: new Date().toISOString(),
      })
      .eq("provider", "razorpay")
      .eq("event_id", eventId);
    await logPaymentError({
      message: "Webhook missing payment/order references",
      type: "WEBHOOK",
      source: "WEBHOOK",
      severity: "ERROR",
      operation: "PROCESS_WEBHOOK",
      webhookEventId: eventId,
      errorCode: "WEBHOOK_MISSING_REFS",
      route: "/api/webhooks/razorpay",
      requestPath: "/api/webhooks/razorpay",
      requestMethod: "POST",
      metadata: { eventName },
    });
    return { ok: false, status: 422, error: "Missing payment references." };
  }

  let paymentQuery = supabase
    .from("payments")
    .select(
      "id, order_id, user_id, provider_order_id, provider_payment_id, amount, amount_minor, currency, status, orders!inner(id, store_id, status, currency, grand_total)",
    );

  if (providerOrderId) {
    paymentQuery = paymentQuery.eq("provider_order_id", providerOrderId);
  } else if (providerPaymentId) {
    paymentQuery = paymentQuery.eq("provider_payment_id", providerPaymentId);
  }

  const { data: payment } = await paymentQuery.maybeSingle();

  if (!payment) {
    await supabase
      .from("payment_webhook_events")
      .update({
        status: "IGNORED",
        processed_at: new Date().toISOString(),
        metadata: { reason: "payment_not_found", eventName } as Json,
      })
      .eq("provider", "razorpay")
      .eq("event_id", eventId);
    return { ok: true, ignored: true };
  }

  const order = payment.orders as unknown as {
    id: string;
    store_id: string;
    status: string;
    currency: string;
    grand_total: number;
  };

  const target = mapProviderStatusToPayment(
    eventName,
    typeof paymentEntity?.status === "string" ? paymentEntity.status : undefined,
  );

  if (!target) {
    await supabase
      .from("payment_webhook_events")
      .update({
        status: "IGNORED",
        processed_at: new Date().toISOString(),
      })
      .eq("provider", "razorpay")
      .eq("event_id", eventId);
    return { ok: true, ignored: true };
  }

  const nextStatus = preferPaymentStatus(payment.status, target);
  if (nextStatus === payment.status && payment.status !== "CREATED") {
    await supabase
      .from("payment_webhook_events")
      .update({
        status: "PROCESSED",
        payment_id: payment.id,
        order_id: payment.order_id,
        processed_at: new Date().toISOString(),
      })
      .eq("provider", "razorpay")
      .eq("event_id", eventId);
    return { ok: true, ignored: true };
  }

  if (!canTransitionPaymentStatus(payment.status, nextStatus)) {
    await supabase
      .from("payment_webhook_events")
      .update({
        status: "IGNORED",
        payment_id: payment.id,
        order_id: payment.order_id,
        processed_at: new Date().toISOString(),
        metadata: {
          reason: "invalid_transition",
          from: payment.status,
          to: nextStatus,
        } as Json,
      })
      .eq("provider", "razorpay")
      .eq("event_id", eventId);
    return { ok: true, ignored: true };
  }

  const expectedMinor =
    payment.amount_minor ??
    majorToMinor(Number(payment.amount), payment.currency);

  if (paymentEntity) {
    const entityAmount =
      typeof paymentEntity.amount === "number" ? paymentEntity.amount : null;
    const entityCurrency =
      typeof paymentEntity.currency === "string"
        ? paymentEntity.currency.toUpperCase()
        : null;
    if (
      entityAmount != null &&
      (entityAmount !== expectedMinor ||
        (entityCurrency && entityCurrency !== payment.currency.toUpperCase()))
    ) {
      await markPaymentFailed({
        paymentId: payment.id,
        storeId: order.store_id,
        userId: payment.user_id,
        reason: "Webhook amount/currency mismatch.",
      });
      await writePaymentAudit({
        storeId: order.store_id,
        userId: payment.user_id,
        action: "RAZORPAY_WEBHOOK_REJECTED",
        entityType: "payment",
        entityId: payment.id,
        metadata: { reason: "amount_mismatch", eventId, eventName },
      });
      await logPaymentError({
        message: "Webhook amount or currency mismatch",
        type: "WEBHOOK",
        source: "WEBHOOK",
        severity: "CRITICAL",
        operation: "PROCESS_WEBHOOK",
        storeId: order.store_id,
        userId: payment.user_id,
        orderId: payment.order_id,
        paymentId: payment.id,
        providerOrderId: payment.provider_order_id,
        providerPaymentId: providerPaymentId,
        webhookEventId: eventId,
        errorCode: "WEBHOOK_AMOUNT_MISMATCH",
        route: "/api/webhooks/razorpay",
        requestPath: "/api/webhooks/razorpay",
        requestMethod: "POST",
      });
      await supabase
        .from("payment_webhook_events")
        .update({
          status: "FAILED",
          payment_id: payment.id,
          order_id: payment.order_id,
          error_message: "amount_mismatch",
          processed_at: new Date().toISOString(),
        })
        .eq("provider", "razorpay")
        .eq("event_id", eventId);
      return { ok: false, status: 422, error: "Amount mismatch." };
    }
  }

  if (nextStatus === "FAILED") {
    await markPaymentFailed({
      paymentId: payment.id,
      storeId: order.store_id,
      userId: payment.user_id,
      reason: "Provider reported payment failed.",
    });
  } else if (nextStatus === "AUTHORIZED" || nextStatus === "CAPTURED") {
    if (!providerPaymentId) {
      await supabase
        .from("payment_webhook_events")
        .update({
          status: "FAILED",
          error_message: "missing_payment_id",
          processed_at: new Date().toISOString(),
        })
        .eq("provider", "razorpay")
        .eq("event_id", eventId);
      return { ok: false, status: 422, error: "Missing payment id." };
    }

    await fulfillVerifiedPayment({
      paymentId: payment.id,
      orderId: payment.order_id,
      storeId: order.store_id,
      userId: payment.user_id ?? "",
      targetStatus: nextStatus,
      providerPaymentId,
      paymentMethod:
        typeof paymentEntity?.method === "string" ? paymentEntity.method : null,
      clearCustomerCart: nextStatus === "CAPTURED",
    });
  }

  await writePaymentAudit({
    storeId: order.store_id,
    userId: payment.user_id,
    action: "RAZORPAY_WEBHOOK_PROCESSED",
    entityType: "payment",
    entityId: payment.id,
    metadata: { eventId, eventName, status: nextStatus },
  });

  await supabase
    .from("payment_webhook_events")
    .update({
      status: "PROCESSED",
      payment_id: payment.id,
      order_id: payment.order_id,
      processed_at: new Date().toISOString(),
    })
    .eq("provider", "razorpay")
    .eq("event_id", eventId);

  return { ok: true };
}
