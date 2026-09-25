import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  buildStorefrontPathsFromNavRows,
  DEFAULT_STOREFRONT_PATHS,
  type StorefrontPathDef,
} from "@/features/seo/storefront-paths";

/**
 * Website pages from Menu & Navigation (root links).
 * Labels prefer header, then footer. Single source for SEO / CTA dropdowns.
 */
export async function loadStorefrontPathsFromNavigation(): Promise<
  StorefrontPathDef[]
> {
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return [];

  const { data, error } = await supabase
    .from("navigation_items")
    .select("id, location, parent_id, label, href, sort_order, is_active")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return [];
  return buildStorefrontPathsFromNavRows(data);
}

/** Nav pages when present; otherwise form seed (until Menu & Navigation is saved). */
export async function resolveAdminStorefrontPaths(): Promise<
  StorefrontPathDef[]
> {
  const fromNav = await loadStorefrontPathsFromNavigation();
  if (fromNav.length) return fromNav;
  return DEFAULT_STOREFRONT_PATHS.map((p) => ({ ...p }));
}
