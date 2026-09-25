import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import {
  resolveSyncPlan,
  type SyncTopic,
} from "@/features/sync/topics";

export type PublishStorefrontSyncInput = {
  storeId: string;
  topics: readonly SyncTopic[];
  /** Extra tags beyond the topic registry (e.g. product-specific). */
  extraTags?: readonly string[];
  /** Extra paths beyond the topic registry. */
  extraPaths?: readonly string[];
};

/**
 * Central Admin→Storefront invalidation:
 * 1) Bust Next.js cache tags/paths from the topic registry
 * 2) Insert a store-scoped sync signal for open storefront tabs (Realtime)
 *
 * Call from Admin mutations after a successful Store-facing write.
 * Never use this for sensitive Admin-only data.
 */
export async function publishStorefrontSync(
  input: PublishStorefrontSyncInput,
): Promise<void> {
  const storeId = input.storeId?.trim();
  if (!storeId || input.topics.length === 0) return;

  const plan = resolveSyncPlan(input.topics);
  for (const tag of [...plan.tags, ...(input.extraTags ?? [])]) {
    revalidateTag(tag, "max");
  }
  for (const path of [...plan.paths, ...(input.extraPaths ?? [])]) {
    revalidatePath(path);
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("storefront_sync_events").insert({
      store_id: storeId,
      topics: [...input.topics],
    });
    if (error) {
      console.error("[storefront-sync] signal insert failed", error.message);
    }
  } catch (error) {
    // Cache invalidation already applied; live tabs fall back to navigation/TTL.
    console.error("[storefront-sync] signal insert failed", error);
  }
}
