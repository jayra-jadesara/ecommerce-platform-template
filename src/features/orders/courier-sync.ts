import "server-only";

import { syncCourierShippedOrders } from "@/features/shipping/courier/service";

export type { CourierSyncResult } from "@/features/shipping/courier/service";

/**
 * Polls Delhivery / Blue Dart for SHIPPED orders under courier_api stores.
 * Marks Delivered when the carrier reports delivered.
 */
export async function syncCourierTrackingForShippedOrders(input?: {
  storeId?: string | null;
  limit?: number;
}) {
  return syncCourierShippedOrders(input);
}
