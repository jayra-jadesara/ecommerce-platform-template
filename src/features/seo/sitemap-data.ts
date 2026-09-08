import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { absoluteUrl } from "@/lib/site-url";
import {
  buildRobotsDisallowPaths,
  shouldIncludeInSitemap,
} from "@/features/seo/sitemap-rules";

export { buildRobotsDisallowPaths, shouldIncludeInSitemap };

const PAGE_SIZE = 500;

function getConfiguredStoreSlug(): string | null {
  const slug =
    process.env.STORE_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_STORE_SLUG?.trim() ||
    "";
  return slug || null;
}

async function resolveStoreId(): Promise<string | null> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;
  const slug = getConfiguredStoreSlug();
  let query = supabase.from("stores").select("id").eq("status", "active").limit(1);
  if (slug) {
    query = supabase
      .from("stores")
      .select("id")
      .eq("status", "active")
      .eq("slug", slug)
      .limit(1);
  }
  const { data } = await query;
  return data?.[0]?.id ?? null;
}

export type SitemapEntry = {
  url: string;
  lastModified?: Date | string;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
};

async function fetchAllSlugs(
  table: "products" | "categories" | "pages",
  storeId: string,
  filters: Record<string, string | boolean>,
): Promise<Array<{ slug: string; updated_at: string | null }>> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];

  const rows: Array<{ slug: string; updated_at: string | null }> = [];
  let from = 0;
  for (;;) {
    let query = supabase
      .from(table)
      .select("slug, updated_at")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query;
    if (error || !data?.length) break;
    for (const row of data) {
      if (row.slug) {
        rows.push({
          slug: row.slug,
          updated_at: row.updated_at ?? null,
        });
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

/**
 * Public indexable URLs only — excludes admin, account, cart, checkout, drafts.
 * Batched DB reads for large catalogs.
 */
export async function collectSitemapEntries(): Promise<SitemapEntry[]> {
  const storeId = await resolveStoreId();
  const entries: SitemapEntry[] = [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/products"),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  if (!storeId) return entries;

  const [products, categories, pages] = await Promise.all([
    fetchAllSlugs("products", storeId, { status: "active" }),
    fetchAllSlugs("categories", storeId, { is_active: true }),
    fetchAllSlugs("pages", storeId, { status: "published" }),
  ]);

  for (const product of products) {
    entries.push({
      url: absoluteUrl(`/products/${product.slug}`),
      lastModified: product.updated_at ?? undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const category of categories) {
    // Skip reserved homepage slug if ever used as category
    if (category.slug === "home") continue;
    entries.push({
      url: absoluteUrl(`/categories/${category.slug}`),
      lastModified: category.updated_at ?? undefined,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const page of pages) {
    if (page.slug === "home") continue;
    entries.push({
      url: absoluteUrl(`/pages/${page.slug}`),
      lastModified: page.updated_at ?? undefined,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
