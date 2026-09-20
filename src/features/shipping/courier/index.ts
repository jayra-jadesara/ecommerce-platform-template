export {
  COURIER_PROVIDERS,
  TRACKING_STATUSES,
  courierProviderLabel,
  isApiCourierProvider,
  isCourierProvider,
  trackingStatusLabel,
  type CourierProvider,
  type CourierStoreCredentials,
  type CreateShipmentInput,
  type CreateShipmentResult,
  type TrackingEvent,
  type TrackingPayload,
  type TrackingStatus,
  type TrackResult,
} from "@/features/shipping/courier/types";
export { normalizeCarrierStatus } from "@/features/shipping/courier/normalize";
export {
  isDeliveredStatus,
  publicTrackingUrl,
  shippingProviderDisplayName,
} from "@/features/shipping/courier/urls";

/** Server helpers: import from `@/features/shipping/courier/service` only in server code. */
