export type ActivityPillTone =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

export type ActivityEventPill = {
  label: string;
  tone: ActivityPillTone;
};

function humanizeEventType(eventType: string): string {
  return eventType
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Short pill label + tone for admin activity rows.
 */
export function activityEventPill(
  eventType: string,
  metadata?: Record<string, unknown> | null,
): ActivityEventPill {
  const key = eventType.trim().toUpperCase();

  if (key === "ORDER_AUTO_DELIVERED") {
    return { label: "Delivered", tone: "success" };
  }

  if (key === "ORDER_STATUS_CHANGED") {
    const to = String(metadata?.to ?? "").toUpperCase();
    if (to === "CONFIRMED") return { label: "Confirmed", tone: "info" };
    if (to === "PROCESSING") return { label: "Processing", tone: "info" };
    if (to === "SHIPPED") return { label: "Shipped", tone: "info" };
    if (to === "DELIVERED") return { label: "Delivered", tone: "success" };
    if (to === "CANCELLED") return { label: "Cancelled", tone: "error" };
    if (to === "REFUNDED") return { label: "Refunded", tone: "info" };
    return { label: "Status", tone: "neutral" };
  }

  switch (key) {
    case "ORDER_CONFIRMED":
    case "STATUS_CONFIRMED":
    case "CONFIRMED":
      return { label: "Confirmed", tone: "info" };
    case "STATUS_PROCESSING":
    case "PROCESSING":
      return { label: "Processing", tone: "info" };
    case "STATUS_SHIPPED":
    case "SHIPPED":
      return { label: "Shipped", tone: "info" };
    case "STATUS_DELIVERED":
    case "DELIVERED":
    case "AUTO_DELIVERED":
      return { label: "Delivered", tone: "success" };
    case "STATUS_CANCELLED":
    case "CANCELLED":
      return { label: "Cancelled", tone: "error" };
    case "STATUS_REFUNDED":
    case "REFUNDED":
      return { label: "Refunded", tone: "info" };
    case "REPLACE_REQUESTED":
      return { label: "Requested", tone: "warning" };
    case "REPLACE_APPROVED":
      return { label: "Granted", tone: "info" };
    case "REPLACE_FULFILLED":
      return { label: "Sent", tone: "success" };
    case "REPLACE_REJECTED":
      return { label: "Rejected", tone: "error" };
    case "REPLACE_CANCELLED":
      return { label: "Cancelled", tone: "error" };
    case "TRACKING_UPDATED":
      return { label: "Tracking", tone: "neutral" };
    case "COURIER_SHIPMENT_CREATED":
      return { label: "Courier", tone: "info" };
    case "COUPON_REDEEMED":
      return { label: "Coupon", tone: "success" };
    case "COUPON_REDEMPTION_FAILED":
    case "INVENTORY_FINALIZATION_FAILED":
    case "INVENTORY_SHORTAGE":
      return { label: "Failed", tone: "error" };
    default:
      break;
  }

  if (key.includes("REPLACE")) {
    if (key.includes("REQUEST")) return { label: "Requested", tone: "warning" };
    if (key.includes("APPROV") || key.includes("GRANT"))
      return { label: "Granted", tone: "info" };
    if (key.includes("FULFIL") || key.includes("SENT"))
      return { label: "Sent", tone: "success" };
    if (key.includes("REJECT")) return { label: "Rejected", tone: "error" };
  }

  if (key.includes("FAIL") || key.includes("ERROR")) {
    return { label: "Failed", tone: "error" };
  }

  return { label: humanizeEventType(eventType), tone: "neutral" };
}
