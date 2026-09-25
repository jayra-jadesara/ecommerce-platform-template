import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";

/** Fire-and-forget brochure download increment. */
export async function recordBrochureDownload(
  brochureId: string,
): Promise<void> {
  if (!brochureId.trim()) return;
  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) return;
    await supabase.rpc("increment_brochure_download", {
      p_brochure_id: brochureId,
    });
  } catch {
    // Analytics must never break the download.
  }
}
