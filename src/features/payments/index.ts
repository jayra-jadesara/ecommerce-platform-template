/** Payments — provider-agnostic checkout with Razorpay as first provider. */
export type {
  CheckoutPaymentSession,
  PaymentActionResult,
  PaymentProvider,
  PaymentVerifyInput,
  StartCheckoutPaymentResult,
} from "@/features/payments/types";

export {
  canTransitionPaymentStatus,
  preferPaymentStatus,
} from "@/features/payments/state-machine";
