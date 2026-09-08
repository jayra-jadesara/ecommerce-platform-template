import type { PaymentStatus } from "@/types/database";

export type PaymentProviderId = "razorpay" | "other" | "none";

export type PaymentVerifyInput = {
  paymentId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
};

export type PaymentActionResult =
  | {
      ok: true;
      paymentId: string;
      orderId: string;
      orderNumber: string;
      status: PaymentStatus;
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };

export type CheckoutPaymentSession = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  provider: "razorpay";
  keyId: string;
  razorpayOrderId: string;
  amountMinor: number;
  currency: string;
  brandName: string;
  description: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

export type StartCheckoutPaymentResult =
  | { ok: true; session: CheckoutPaymentSession }
  | { ok: false; error: string; code?: string };

export type ProviderCreateOrderInput = {
  amountMinor: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
};

export type ProviderCreateOrderResult = {
  providerOrderId: string;
  amountMinor: number;
  currency: string;
  status: string;
};

export type ProviderPaymentDetails = {
  providerPaymentId: string;
  providerOrderId: string;
  amountMinor: number;
  currency: string;
  status: string;
  method: string | null;
};

export type PaymentProvider = {
  id: PaymentProviderId;
  createOrder: (
    input: ProviderCreateOrderInput,
  ) => Promise<ProviderCreateOrderResult>;
  verifyCheckoutSignature: (input: {
    providerOrderId: string;
    providerPaymentId: string;
    signature: string;
  }) => boolean;
  verifyWebhookSignature: (input: {
    rawBody: string;
    signature: string;
  }) => boolean;
  fetchPayment: (providerPaymentId: string) => Promise<ProviderPaymentDetails>;
  fetchOrder: (providerOrderId: string) => Promise<{
    providerOrderId: string;
    amountMinor: number;
    currency: string;
    status: string;
  }>;
};

export type RazorpayCheckoutSuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};
