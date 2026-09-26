import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type ServiceClient = SupabaseClient<Database>;

const REMOVE_BATCH = 100;
const LIST_LIMIT = 1000;

/**
 * Recursively list object paths under a bucket (optional prefix).
 * Folders are identified by null `id` (Supabase Storage convention).
 */
export async function listStorageObjectPaths(
  supabase: ServiceClient,
  bucket: string,
  prefix = "",
): Promise<string[]> {
  const paths: string[] = [];
  const queue: string[] = [prefix];

  while (queue.length > 0) {
    const folder = queue.shift()!;
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.storage.from(bucket).list(folder, {
        limit: LIST_LIMIT,
        offset,
      });
      if (error || !data?.length) break;

      for (const item of data) {
        if (!item.name || item.name === ".emptyFolderPlaceholder") continue;
        const full = folder ? `${folder}/${item.name}` : item.name;
        const isFolder = item.id === null;
        if (isFolder) {
          queue.push(full);
        } else {
          paths.push(full);
        }
      }

      if (data.length < LIST_LIMIT) break;
      offset += LIST_LIMIT;
    }
  }

  return paths;
}

export async function removeStoragePaths(
  supabase: ServiceClient,
  bucket: string,
  paths: string[],
): Promise<{ removed: number; errors: string[] }> {
  const errors: string[] = [];
  let removed = 0;

  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const batch = paths.slice(i, i + REMOVE_BATCH);
    const { error, data } = await supabase.storage.from(bucket).remove(batch);
    if (error) {
      errors.push(`${bucket}: ${error.message}`);
      continue;
    }
    removed += data?.length ?? batch.length;
  }

  return { removed, errors };
}

/** Empty an entire bucket (all objects). Does not delete the bucket. */
export async function emptyStorageBucket(
  supabase: ServiceClient,
  bucket: string,
): Promise<{ removed: number; errors: string[] }> {
  const paths = await listStorageObjectPaths(supabase, bucket);
  if (paths.length === 0) return { removed: 0, errors: [] };
  return removeStoragePaths(supabase, bucket, paths);
}
