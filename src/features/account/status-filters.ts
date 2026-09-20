import type { OrderStatus, PaymentStatus } from "@/types/database";

/** Order statuses customers can filter on (excludes abandoned PENDING checkouts). */
export const ACCOUNT_ORDER_STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

export const ACCOUNT_PAYMENT_STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CAPTURED", label: "Captured" },
  { value: "AUTHORIZED", label: "Authorized" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

export type AccountOrderStatusFilter =
  | "all"
  | Exclude<OrderStatus, "PENDING">;

export type AccountPaymentStatusFilter = "all" | PaymentStatus;

export function parseAccountOrderStatusFilter(
  raw: string | undefined | null,
): AccountOrderStatusFilter {
  const value = (raw ?? "all").trim().toUpperCase();
  if (value === "ALL" || !value) return "all";
  const allowed = ACCOUNT_ORDER_STATUS_FILTERS.map((o) => o.value);
  return (allowed as readonly string[]).includes(value)
    ? (value as AccountOrderStatusFilter)
    : "all";
}

export function parseAccountPaymentStatusFilter(
  raw: string | undefined | null,
): AccountPaymentStatusFilter {
  const value = (raw ?? "all").trim().toUpperCase();
  if (value === "ALL" || !value) return "all";
  const allowed = ACCOUNT_PAYMENT_STATUS_FILTERS.map((o) => o.value);
  return (allowed as readonly string[]).includes(value)
    ? (value as AccountPaymentStatusFilter)
    : "all";
}

/**
 * When an order is cancelled, unpaid payment rows should read as Cancelled
 * even if the DB row was left PENDING (legacy / failed constraint).
 */
export function effectivePaymentStatus(input: {
  paymentStatus: string | null | undefined;
  orderStatus?: string | null;
}): string {
  const payment = (input.paymentStatus ?? "").trim().toUpperCase();
  const order = (input.orderStatus ?? "").trim().toUpperCase();
  if (
    order === "CANCELLED" &&
    (payment === "PENDING" ||
      payment === "CREATED" ||
      payment === "FAILED" ||
      payment === "CANCELLED" ||
      !payment)
  ) {
    return "CANCELLED";
  }
  return payment || "—";
}
