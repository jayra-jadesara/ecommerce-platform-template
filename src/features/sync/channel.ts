/** Shared channel / filter helpers for storefront sync (client + tests). */

export const STOREFRONT_SYNC_TABLE = "storefront_sync_events" as const;

export type StorefrontSyncEventPayload = {
  topics: string[];
  storeId: string;
  at: number;
};

export function storefrontSyncFilter(storeId: string): string {
  return `store_id=eq.${storeId}`;
}
