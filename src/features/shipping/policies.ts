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
      "Track with a courier partner. Delivery status follows tracking (manual tracking works today; API connect next).",
    badge: "Tracking based",
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
      return "Approved";
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
