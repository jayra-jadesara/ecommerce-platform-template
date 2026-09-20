import { resolvePaymentProviderKind } from "@/features/orders/payment-method-ui";
import { canTransitionOrderStatus } from "@/features/orders/state-machine";
import type { OrderStatus } from "@/types/database";

/** Customer self-serve COD cancel is allowed only before shipment. */
const CUSTOMER_COD_CANCEL_STATUSES = new Set<OrderStatus>([
  "CONFIRMED",
  "PROCESSING",
]);

export function canCustomerCancelCodOrder(input: {
  status: OrderStatus;
  paymentProvider: string | null | undefined;
}): boolean {
  if (resolvePaymentProviderKind(input.paymentProvider) !== "cod") return false;
  if (!CUSTOMER_COD_CANCEL_STATUSES.has(input.status)) return false;
  return canTransitionOrderStatus(input.status, "CANCELLED");
}
