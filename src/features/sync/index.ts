/** Client-safe sync exports (no server-only). */
export type { SyncTopic, SyncTopicDefinition } from "@/features/sync/topics";
export {
  SYNC_TOPICS,
  SYNC_TOPIC_REGISTRY,
  STOREFRONT_BROCHURE_CACHE_TAG,
  STOREFRONT_COUPONS_CACHE_TAG,
  isSyncTopic,
  resolveSyncPlan,
} from "@/features/sync/topics";
export { StorefrontSyncListener } from "@/features/sync/StorefrontSyncListener";
export {
  STOREFRONT_SYNC_TABLE,
  storefrontSyncFilter,
} from "@/features/sync/channel";
