import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  cmsSlugFromPath,
  DEFAULT_STOREFRONT_PATHS,
  normalizeStorefrontPath,
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

  const byPath = new Map<string, StorefrontPathDef & { rank: number }>();

  for (const row of data) {
    if (row.parent_id) continue;
    const href = String(row.href ?? "").trim();
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const path = normalizeStorefrontPath(href);
    const label = String(row.label ?? "").trim() || path;
    const rank =
      (row.location === "header" ? 0 : 1) + (row.is_active ? 0 : 10);
    const existing = byPath.get(path);
    if (existing && existing.rank <= rank) continue;
    byPath.set(path, {
      id: String(row.id),
      path,
      label,
      cmsSlug: cmsSlugFromPath(path),
      rank,
    });
  }

  return [...byPath.values()]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(({ rank: _rank, ...rest }) => rest);
}

/** Nav pages when present; otherwise form seed (until Menu & Navigation is saved). */
export async function resolveAdminStorefrontPaths(): Promise<
  StorefrontPathDef[]
> {
  const fromNav = await loadStorefrontPathsFromNavigation();
  if (fromNav.length) return fromNav;
  return DEFAULT_STOREFRONT_PATHS.map((p) => ({ ...p }));
}
