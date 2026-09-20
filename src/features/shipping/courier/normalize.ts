import type { TrackingStatus } from "@/features/shipping/courier/types";

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/** Map free-text / carrier status codes into normalized tracking status. */
export function normalizeCarrierStatus(raw: string | null | undefined): TrackingStatus {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "PENDING";

  if (
    includesAny(s, [
      "delivered",
      "dlvrd",
      "rto-delivered",
      "delivery completed",
      "consignee received",
    ])
  ) {
    return "DELIVERED";
  }
  if (
    includesAny(s, [
      "out for delivery",
      "ofd",
      "out_for_delivery",
      "with delivery executive",
    ])
  ) {
    return "OUT_FOR_DELIVERY";
  }
  if (
    includesAny(s, [
      "picked",
      "pickup",
      "dispatched",
      "manifested",
      "in transit",
      "intransit",
      "in_transit",
      "reached",
      "departed",
      "arrived",
      "hub",
      "facility",
      "shipped",
    ])
  ) {
    if (includesAny(s, ["picked", "pickup", "manifest"])) return "PICKED_UP";
    return "IN_TRANSIT";
  }
  if (
    includesAny(s, [
      "cancel",
      "cancelled",
      "canceled",
      "rto",
      "returned",
      "undelivered",
      "failed",
      "exception",
      "hold",
      "lost",
      "damaged",
    ])
  ) {
    if (includesAny(s, ["cancel"])) return "CANCELLED";
    return "EXCEPTION";
  }
  if (includesAny(s, ["pending", "created", "booked", "open", "awb"])) {
    return "PENDING";
  }
  return "IN_TRANSIT";
}
