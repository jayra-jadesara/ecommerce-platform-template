import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicTable } from "@/features/platform-usage/cleanup/keep-wipe";
import type { Database } from "@/types/database";

type ServiceClient = SupabaseClient<Database>;

/** Matches every row that has a non-null uuid `id`. */
const ALL_ROWS_FILTER_ID = "00000000-0000-0000-0000-000000000000";

/** Junction / PK-without-id tables need a dedicated wipe filter. */
const SPECIAL_DELETE: Partial<
  Record<PublicTable, { column: string }>
> = {
  inventory: { column: "variant_id" },
  store_reel_products: { column: "reel_id" },
  blog_post_categories: { column: "post_id" },
  blog_post_products: { column: "post_id" },
};

/**
 * Untyped delete builder — `from(union of tables)` collapses filter columns to never.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = any;

export async function countTableRows(
  supabase: ServiceClient,
  table: PublicTable,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error(`[cleanup] count ${table}:`, error.message);
    return 0;
  }
  return count ?? 0;
}

export async function deleteAllTableRows(
  supabase: ServiceClient,
  table: PublicTable,
): Promise<number> {
  const special = SPECIAL_DELETE[table];
  const query = supabase.from(table) as AnyQuery;

  if (special) {
    const { count, error } = await query
      .delete({ count: "exact" })
      .not(special.column, "is", null);
    if (error) {
      throw new Error(`Failed to clear ${table}: ${error.message}`);
    }
    return (count as number | null) ?? 0;
  }

  const { count, error } = await query
    .delete({ count: "exact" })
    .neq("id", ALL_ROWS_FILTER_ID);

  if (error) {
    throw new Error(`Failed to clear ${table}: ${error.message}`);
  }
  return (count as number | null) ?? 0;
}

/** Delete inventory movements that reference an order (keep pure stock adjusts). */
export async function deleteOrderLinkedInventoryMovements(
  supabase: ServiceClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("inventory_movements")
    .delete({ count: "exact" })
    .not("order_id", "is", null);

  if (error) {
    throw new Error(
      `Failed to clear order inventory movements: ${error.message}`,
    );
  }
  return count ?? 0;
}

export async function nullFeaturedProductRefs(
  supabase: ServiceClient,
): Promise<void> {
  await supabase
    .from("store_settings")
    .update({ footer_featured_product_id: null })
    .not("footer_featured_product_id", "is", null);

  await supabase
    .from("blog_settings")
    .update({ featured_post_id: null })
    .not("featured_post_id", "is", null);
}
