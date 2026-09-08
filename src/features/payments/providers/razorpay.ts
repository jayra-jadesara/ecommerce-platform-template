import "server-only";

import { getRazorpayEnv, hasRazorpayWebhookSecret } from "@/features/payments/env";
import {
  verifyRazorpayCheckoutSignaturePure,
  verifyRazorpayWebhookSignaturePure,
} from "@/features/payments/providers/razorpay-crypto";
import type {
  PaymentProvider,
  ProviderCreateOrderInput,
  ProviderCreateOrderResult,
  ProviderPaymentDetails,
} from "@/features/payments/types";

export {
  computeRazorpayCheckoutSignature,
  computeRazorpayWebhookSignature,
  verifyRazorpayCheckoutSignaturePure,
  verifyRazorpayWebhookSignaturePure,
} from "@/features/payments/providers/razorpay-crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

function basicAuthHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function razorpayFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { keyId, keySecret } = getRazorpayEnv();
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    ...init,
    headers: {
      Authorization: basicAuthHeader(keyId, keySecret),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const description =
      typeof body.error === "object" &&
      body.error &&
      "description" in (body.error as object)
        ? String((body.error as { description?: string }).description)
        : `Razorpay API error (${response.status})`;
    throw new Error(description);
  }

  return body as T;
}

export const razorpayPaymentProvider: PaymentProvider = {
  id: "razorpay",

  async createOrder(
    input: ProviderCreateOrderInput,
  ): Promise<ProviderCreateOrderResult> {
    const order = await razorpayFetch<{
      id: string;
      amount: number;
      currency: string;
      status: string;
    }>("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: input.amountMinor,
        currency: input.currency.toUpperCase(),
        receipt: input.receipt.slice(0, 40),
        notes: input.notes ?? {},
      }),
    });

    return {
      providerOrderId: order.id,
      amountMinor: order.amount,
      currency: order.currency,
      status: order.status,
    };
  },

  verifyCheckoutSignature(input): boolean {
    const { keySecret } = getRazorpayEnv();
    return verifyRazorpayCheckoutSignaturePure({
      orderId: input.providerOrderId,
      paymentId: input.providerPaymentId,
      signature: input.signature,
      secret: keySecret,
    });
  },

  verifyWebhookSignature(input): boolean {
    if (!hasRazorpayWebhookSecret()) return false;
    const { webhookSecret } = getRazorpayEnv();
    if (!webhookSecret) return false;
    return verifyRazorpayWebhookSignaturePure({
      rawBody: input.rawBody,
      signature: input.signature,
      secret: webhookSecret,
    });
  },

  async fetchPayment(
    providerPaymentId: string,
  ): Promise<ProviderPaymentDetails> {
    const payment = await razorpayFetch<{
      id: string;
      order_id: string;
      amount: number;
      currency: string;
      status: string;
      method?: string;
    }>(`/payments/${encodeURIComponent(providerPaymentId)}`);

    return {
      providerPaymentId: payment.id,
      providerOrderId: payment.order_id,
      amountMinor: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method ?? null,
    };
  },

  async fetchOrder(providerOrderId: string) {
    const order = await razorpayFetch<{
      id: string;
      amount: number;
      currency: string;
      status: string;
    }>(`/orders/${encodeURIComponent(providerOrderId)}`);

    return {
      providerOrderId: order.id,
      amountMinor: order.amount,
      currency: order.currency,
      status: order.status,
    };
  },
};
