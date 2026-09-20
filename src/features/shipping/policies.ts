/** Store / product fulfillment & return policies shown in admin + storefront. */

export const FULFILLMENT_MODES = ["auto_days", "courier_api"] as const;
export type FulfillmentMode = (typeof FULFILLMENT_MODES)[number];

export const RETURN_POLICIES = [
  "no_return_refund",
  "no_replace",
  "replace_only",
] as const;
export type ReturnPolicy = (typeof RETURN_POLICIES)[number];

export const FULFILLMENT_MODE_OPTIONS: Array<{
  value: FulfillmentMode;
  title: string;
  description: string;
  badge: string;
}> = [
  {
    value: "auto_days",
    title: "Auto after N days",
    description:
      "After you mark an order Shipped, it becomes Delivered automatically if there is no complaint.",
    badge: "Best for small shops",
  },
  {
    value: "courier_api",
    title: "Courier API",
    description:
      "Pick one carrier (Delhivery or Blue Dart). Create AWB and sync tracking; Delivered when that carrier reports it.",
    badge: "One courier",
  },
];

export const RETURN_POLICY_OPTIONS: Array<{
  value: ReturnPolicy;
  title: string;
  description: string;
  storeLabel: string;
}> = [
  {
    value: "no_return_refund",
    title: "No return / no refund",
    description: "Final sale. Typical for food, spices, and opened packs.",
    storeLabel: "No return / no refund",
  },
  {
    value: "no_replace",
    title: "No replace",
    description: "Customer may request a refund, but no product exchange.",
    storeLabel: "No replacement — refund may apply",
  },
  {
    value: "replace_only",
    title: "Replace only",
    description: "Exchange for the same item only. No cash refund.",
    storeLabel: "Replace only — no cash refund",
  },
];

export function isFulfillmentMode(value: unknown): value is FulfillmentMode {
  return (
    typeof value === "string" &&
    (FULFILLMENT_MODES as readonly string[]).includes(value)
  );
}

export function isReturnPolicy(value: unknown): value is ReturnPolicy {
  return (
    typeof value === "string" &&
    (RETURN_POLICIES as readonly string[]).includes(value)
  );
}

export function returnPolicyLabel(policy: ReturnPolicy): string {
  return (
    RETURN_POLICY_OPTIONS.find((option) => option.value === policy)?.storeLabel ??
    "No return / no refund"
  );
}

/** Cash/local refund blocked for final-sale and replace-only policies. */
export function returnPolicyBlocksRefund(policy: ReturnPolicy): boolean {
  return policy === "no_return_refund" || policy === "replace_only";
}

/** Customer may request a product replacement. */
export function returnPolicyAllowsReplace(policy: ReturnPolicy): boolean {
  return policy === "replace_only";
}

export function returnPolicyFromLegacyAllowed(allowed: boolean): ReturnPolicy {
  return allowed ? "no_replace" : "no_return_refund";
}

/**
 * Product override wins; otherwise use store Delivery & returns default.
 */
export function resolveReturnPolicy(
  productPolicy: string | null | undefined,
  storePolicy: string | null | undefined,
): ReturnPolicy {
  if (isReturnPolicy(productPolicy)) return productPolicy;
  if (isReturnPolicy(storePolicy)) return storePolicy;
  return "no_return_refund";
}

export function coerceReturnPolicy(
  value: unknown,
  fallback: ReturnPolicy = "no_return_refund",
): ReturnPolicy {
  return isReturnPolicy(value) ? value : fallback;
}

export const REPLACE_REQUEST_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "FULFILLED",
  "CANCELLED",
] as const;
export type ReplaceRequestStatus = (typeof REPLACE_REQUEST_STATUSES)[number];

export function replaceRequestStatusLabel(status: ReplaceRequestStatus): string {
  switch (status) {
    case "REQUESTED":
      return "Requested";
    case "APPROVED":
      return "Replacement request granted";
    case "REJECTED":
      return "Rejected";
    case "FULFILLED":
      return "Replacement sent";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

export const REPLACE_WINDOW_HOURS = [24, 48, 72, 168] as const;
export type ReplaceWindowHours = (typeof REPLACE_WINDOW_HOURS)[number];

export const DEFAULT_REPLACE_REASON_OPTIONS = [
  "Product damaged",
  "Product opened",
  "Wrong item received",
  "Other",
] as const;

export const DEFAULT_CANCEL_REASON_OPTIONS = [
  "Changed mind",
  "Ordered by mistake",
  "Wrong address / details",
  "Found better price",
  "Delivery too slow",
  "Other",
] as const;

export function coerceReplaceWindowHours(value: unknown): ReplaceWindowHours {
  const n = typeof value === "number" ? value : Number(value);
  if ((REPLACE_WINDOW_HOURS as readonly number[]).includes(n)) {
    return n as ReplaceWindowHours;
  }
  return 72;
}

export function coerceReplaceMaxAttempts(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.floor(n)));
}

export function coerceReplaceReasonOptions(value: unknown): string[] {
  const fallback = [...DEFAULT_REPLACE_REASON_OPTIONS];
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0 && item.length <= 80)
    .slice(0, 12);
  if (!cleaned.length) return fallback;
  const hasOther = cleaned.some((item) => item.toLowerCase() === "other");
  return hasOther ? cleaned : [...cleaned, "Other"];
}

export function coerceCancelReasonOptions(value: unknown): string[] {
  const fallback = [...DEFAULT_CANCEL_REASON_OPTIONS];
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0 && item.length <= 80)
    .slice(0, 12);
  if (!cleaned.length) return fallback;
  const hasOther = cleaned.some((item) => item.toLowerCase() === "other");
  return hasOther ? cleaned : [...cleaned, "Other"];
}

export type ReplaceStoreRules = {
  photoRequired: boolean;
  windowHours: ReplaceWindowHours;
  maxAttempts: number;
  reasonOptions: string[];
};

/** Hours remaining in the replace window after deliveredAt; null if unknown/not started. */
export function replaceWindowHoursRemaining(
  deliveredAt: string | null | undefined,
  windowHours: number,
  nowMs: number = Date.now(),
): number | null {
  if (!deliveredAt) return null;
  const start = Date.parse(deliveredAt);
  if (!Number.isFinite(start)) return null;
  const end = start + windowHours * 60 * 60 * 1000;
  return Math.max(0, (end - nowMs) / (60 * 60 * 1000));
}

export function isWithinReplaceWindow(
  deliveredAt: string | null | undefined,
  windowHours: number,
  nowMs: number = Date.now(),
): boolean {
  const remaining = replaceWindowHoursRemaining(deliveredAt, windowHours, nowMs);
  return remaining != null && remaining > 0;
}

export function formatReplaceWindowRemaining(
  deliveredAt: string | null | undefined,
  windowHours: number,
  nowMs: number = Date.now(),
): string | null {
  const remaining = replaceWindowHoursRemaining(deliveredAt, windowHours, nowMs);
  if (remaining == null) return null;
  if (remaining <= 0) return "Replace window closed";
  if (remaining < 1) {
    const mins = Math.max(1, Math.ceil(remaining * 60));
    return `${mins} min left to request`;
  }
  const hours = Math.ceil(remaining);
  return `${hours} hour${hours === 1 ? "" : "s"} left to request`;
}

export type ReplaceEligibility =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Customer may open a new replace request for a line when:
 * Delivered + replace_only + within window + attempts left + no open request.
 */
export function evaluateReplaceEligibility(input: {
  orderStatus: string;
  itemPolicy: string | null | undefined;
  deliveredAt: string | null | undefined;
  windowHours: number;
  maxAttempts: number;
  priorAttemptCount: number;
  hasOpenRequest: boolean;
  nowMs?: number;
}): ReplaceEligibility {
  if (
    !isReturnPolicy(input.itemPolicy) ||
    !returnPolicyAllowsReplace(input.itemPolicy)
  ) {
    return { ok: false, reason: "This item is not eligible for replacement." };
  }
  if (input.orderStatus !== "DELIVERED") {
    return {
      ok: false,
      reason: "Replacements can be requested after the order is delivered.",
    };
  }
  if (!input.deliveredAt) {
    return {
      ok: false,
      reason: "Delivery time is missing for this order.",
    };
  }
  if (
    !isWithinReplaceWindow(
      input.deliveredAt,
      input.windowHours,
      input.nowMs,
    )
  ) {
    return { ok: false, reason: "The replacement window has closed." };
  }
  if (input.hasOpenRequest) {
    return {
      ok: false,
      reason: "A replacement request is already open for this item.",
    };
  }
  if (input.priorAttemptCount >= input.maxAttempts) {
    return {
      ok: false,
      reason: "Replacement limit reached for this item.",
    };
  }
  return { ok: true };
}

export function isOtherReplaceReason(label: string): boolean {
  return label.trim().toLowerCase() === "other";
}

export function isOtherCancelReason(label: string): boolean {
  return label.trim().toLowerCase() === "other";
}
