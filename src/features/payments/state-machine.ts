import type { PaymentStatus } from "@/types/database";

/**
 * Forward-only payment status transitions.
 * Webhooks and verify handlers must never downgrade (e.g. CAPTURED → AUTHORIZED).
 */
const ALLOWED: Record<PaymentStatus, ReadonlySet<PaymentStatus>> = {
  CREATED: new Set(["PENDING", "FAILED", "AUTHORIZED", "CAPTURED"]),
  PENDING: new Set(["AUTHORIZED", "CAPTURED", "FAILED"]),
  AUTHORIZED: new Set(["CAPTURED", "FAILED", "REFUNDED"]),
  CAPTURED: new Set(["REFUNDED"]),
  FAILED: new Set([]),
  REFUNDED: new Set([]),
};

export function canTransitionPaymentStatus(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.has(to) ?? false;
}

export function assertPaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): void {
  if (!canTransitionPaymentStatus(from, to)) {
    throw new Error(`Invalid payment transition: ${from} → ${to}`);
  }
}

/** Prefer the more advanced status when reconciling out-of-order webhooks. */
export function preferPaymentStatus(
  current: PaymentStatus,
  incoming: PaymentStatus,
): PaymentStatus {
  if (canTransitionPaymentStatus(current, incoming)) return incoming;
  return current;
}
