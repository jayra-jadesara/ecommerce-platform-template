import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";

/** Fire-and-forget PDP view increment (does not throw to callers). */
export async function recordProductView(productId: string): Promise<void> {
  if (!productId.trim()) return;
  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) return;
    await supabase.rpc("increment_product_view", {
      p_product_id: productId,
    });
  } catch {
    // Analytics must never break the product page.
  }
}
