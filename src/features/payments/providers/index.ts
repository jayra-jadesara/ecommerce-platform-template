import "server-only";

import { razorpayPaymentProvider } from "@/features/payments/providers/razorpay";
import type { PaymentProvider, PaymentProviderId } from "@/features/payments/types";

export function getPaymentProvider(provider: string): PaymentProvider {
  const id = provider.toLowerCase() as PaymentProviderId;
  if (id === "razorpay") return razorpayPaymentProvider;
  throw new Error(`Unsupported payment provider: ${provider}`);
}

export { razorpayPaymentProvider };
