import { normalizeCarrierStatus } from "@/features/shipping/courier/normalize";
import type { TrackingStatus } from "@/features/shipping/courier/types";

export { normalizeCarrierStatus };

/** Public customer-facing tracking URLs (no API key required). */
export function publicTrackingUrl(
  provider: "delhivery" | "bluedart" | "manual" | string | null | undefined,
  awb: string | null | undefined,
): string | null {
  const code = (awb ?? "").trim();
  if (!code) return null;
  const p = (provider ?? "").toLowerCase();
  if (p === "delhivery") {
    return `https://www.delhivery.com/track/package/${encodeURIComponent(code)}`;
  }
  if (p === "bluedart" || p === "blue dart") {
    return `https://www.bluedart.com/tracking?trackNo=${encodeURIComponent(code)}`;
  }
  return null;
}

export function shippingProviderDisplayName(
  provider: string | null | undefined,
): string {
  const p = (provider ?? "").toLowerCase();
  if (p === "delhivery") return "Delhivery";
  if (p === "bluedart" || p === "blue dart") return "Blue Dart";
  if (p === "manual") return "Manual";
  return provider?.trim() || "Courier";
}

export function isDeliveredStatus(status: TrackingStatus | null | undefined): boolean {
  return status === "DELIVERED";
}
