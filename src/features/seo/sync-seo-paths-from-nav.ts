import "server-only";

import type { StorefrontPathDef } from "@/features/seo/storefront-paths";
import {
  parseSitemapPaths,
  syncSitemapRowsFromCatalog,
} from "@/features/seo/sitemap-paths";
import type { Json } from "@/types/database";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * After Menu & Navigation changes, keep Google & SEO path lists in sync
 * for this store (labels/paths from nav; keep Include + Importance).
 */
export async function syncSeoPathsFromNavigationCatalog(
  supabase: ServerClient,
  storeId: string,
  catalog: StorefrontPathDef[],
): Promise<void> {
  if (!catalog.length) return;

  const { data: row } = await supabase
    .from("store_seo_settings")
    .select("schema_settings")
    .eq("store_id", storeId)
    .maybeSingle();

  if (!row) return;

  const raw = (row as { schema_settings?: unknown }).schema_settings;
  const current =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};

  const storefrontPaths = catalog.map((p) => ({
    id: p.id,
    path: p.path,
    label: p.label,
    cmsSlug: p.cmsSlug,
  }));
  const sitemapPaths = syncSitemapRowsFromCatalog(
    parseSitemapPaths(current.sitemapPaths),
    storefrontPaths,
  );

  await supabase
    .from("store_seo_settings")
    .update({
      schema_settings: {
        ...current,
        storefrontPaths,
        sitemapPaths,
      } as Json,
    })
    .eq("store_id", storeId);
}
