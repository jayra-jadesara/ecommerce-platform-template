export const COURIER_PROVIDERS = ["delhivery", "bluedart", "manual"] as const;
export type CourierProvider = (typeof COURIER_PROVIDERS)[number];

export const TRACKING_STATUSES = [
  "PENDING",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "EXCEPTION",
  "CANCELLED",
] as const;
export type TrackingStatus = (typeof TRACKING_STATUSES)[number];

export type TrackingEvent = {
  at: string | null;
  status: string;
  location?: string | null;
  detail?: string | null;
};

export type TrackResult = {
  ok: true;
  status: TrackingStatus;
  awb: string;
  events: TrackingEvent[];
  rawSummary?: string | null;
} | {
  ok: false;
  error: string;
};

export type CreateShipmentInput = {
  orderNumber: string;
  orderId: string;
  paymentMode: "COD" | "Prepaid";
  collectAmount: number;
  currency: string;
  weightGrams?: number;
  consignee: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
  };
};

export type CreateShipmentResult = {
  ok: true;
  awb: string;
  shipmentId?: string | null;
  labelUrl?: string | null;
} | {
  ok: false;
  error: string;
};

export type CourierStoreCredentials = {
  sandbox: boolean;
  defaultProvider: "delhivery" | "bluedart" | null;
  delhiveryApiToken: string | null;
  delhiveryClientName: string | null;
  bluedartLoginId: string | null;
  bluedartLicenceKey: string | null;
  bluedartApiKey: string | null;
  bluedartApiSecret: string | null;
  bluedartOriginArea: string | null;
};

export type TrackingPayload = {
  status: TrackingStatus;
  awb: string;
  provider: CourierProvider;
  events: TrackingEvent[];
  syncedAt: string;
  rawSummary?: string | null;
};

export function isCourierProvider(value: unknown): value is CourierProvider {
  return (
    typeof value === "string" &&
    (COURIER_PROVIDERS as readonly string[]).includes(value)
  );
}

export function isApiCourierProvider(
  value: unknown,
): value is "delhivery" | "bluedart" {
  return value === "delhivery" || value === "bluedart";
}

export function courierProviderLabel(provider: CourierProvider | null | undefined): string {
  switch (provider) {
    case "delhivery":
      return "Delhivery";
    case "bluedart":
      return "Blue Dart";
    case "manual":
      return "Manual";
    default:
      return "Courier";
  }
}

export function trackingStatusLabel(status: TrackingStatus | null | undefined): string {
  switch (status) {
    case "PENDING":
      return "Pending pickup";
    case "PICKED_UP":
      return "Picked up";
    case "IN_TRANSIT":
      return "In transit";
    case "OUT_FOR_DELIVERY":
      return "Out for delivery";
    case "DELIVERED":
      return "Delivered";
    case "EXCEPTION":
      return "Exception";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Unknown";
  }
}
