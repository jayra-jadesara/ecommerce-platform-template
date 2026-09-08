import type { OrderStatus } from "@/types/database";

/**
 * Forward-only order status transitions for admin fulfillment.
 */
const ALLOWED: Record<OrderStatus, ReadonlySet<OrderStatus>> = {
  PENDING: new Set(["CONFIRMED", "CANCELLED"]),
  CONFIRMED: new Set(["PROCESSING", "CANCELLED", "REFUNDED"]),
  PROCESSING: new Set(["SHIPPED", "CANCELLED", "REFUNDED"]),
  SHIPPED: new Set(["DELIVERED", "REFUNDED"]),
  DELIVERED: new Set(["REFUNDED"]),
  CANCELLED: new Set([]),
  REFUNDED: new Set([]),
};

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.has(to) ?? false;
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrderStatus(from, to)) {
    throw new Error(`Invalid order transition: ${from} → ${to}`);
  }
}

export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending payment";
    case "CONFIRMED":
      return "Confirmed";
    case "PROCESSING":
      return "Processing";
    case "SHIPPED":
      return "Shipped";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    case "REFUNDED":
      return "Refunded";
    default:
      return status;
  }
}
