import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { absoluteUrl, resolveSiteOrigin } from "@/lib/site-url";
import {
  buildRobotsDisallowPaths,
  shouldIncludeInSitemap,
} from "@/features/seo/sitemap-rules";
import {
  buildStorefrontPathsFromNavRows,
  type StorefrontPathDef,
} from "@/features/seo/storefront-paths";
import {
  enabledSitemapPaths,
  parseSitemapPaths,
  syncSitemapRowsFromCatalog,
  type SeoSitemapPath,
} from "@/features/seo/sitemap-paths";

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

async function loadSeoForSitemap(storeId: string): Promise<{
  robotsIndex: boolean;
  siteOrigin: string;
  sitemapProducts: boolean;
  sitemapCategories: boolean;
  sitemapBlog: boolean;
  sitemapPaths: SeoSitemapPath[];
}> {
  const empty = {
    robotsIndex: true,
    siteOrigin: resolveSiteOrigin(),
    sitemapProducts: true,
    sitemapCategories: true,
    sitemapBlog: true,
    sitemapPaths: [] as SeoSitemapPath[],
  };
  const supabase = createSupabasePublicClient();
  if (!supabase) return empty;

  const [{ data }, { data: navRows }] = await Promise.all([
    supabase
      .from("store_seo_settings")
      .select("robots_index, canonical_url, schema_settings")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("navigation_items")
      .select("id, location, parent_id, label, href, is_active")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true }),
  ]);

  const raw = (data as { schema_settings?: unknown } | null)?.schema_settings;
  const o =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const bool = (key: string, fallback: boolean) =>
    typeof o[key] === "boolean" ? (o[key] as boolean) : fallback;

  const navCatalog: StorefrontPathDef[] = navRows?.length
    ? buildStorefrontPathsFromNavRows(navRows)
    : [];
  const storedPaths = parseSitemapPaths(o.sitemapPaths);
  // Public sitemap always follows this store’s Menu & Navigation for path/label.
  const sitemapPaths = navCatalog.length
    ? syncSitemapRowsFromCatalog(storedPaths, navCatalog)
    : storedPaths;

  return {
    robotsIndex: data?.robots_index !== false,
    siteOrigin: resolveSiteOrigin(data?.canonical_url),
    sitemapProducts: bool("sitemapProducts", true),
    sitemapCategories: bool("sitemapCategories", true),
    sitemapBlog: bool("sitemapBlog", true),
    sitemapPaths,
  };
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
 * Public indexable URLs — menu pages from this store’s Menu & Navigation
 * (Include / Importance from Google & SEO). Product / category / blog follow toggles.
 */
export async function collectSitemapEntries(): Promise<SitemapEntry[]> {
  const storeId = await resolveStoreId();
  if (!storeId) return [];

  const seo = await loadSeoForSitemap(storeId);
  if (!seo.robotsIndex) return [];

  const core = enabledSitemapPaths(seo.sitemapPaths);
  const entries: SitemapEntry[] = core.map(({ path, priority }) => ({
    url: absoluteUrl(path, seo.siteOrigin),
    changeFrequency: path === "/" || path === "/products" ? "daily" : "weekly",
    priority,
  }));

  const [products, categories, blogPosts] = await Promise.all([
    seo.sitemapProducts
      ? fetchAllSlugs("products", storeId, { status: "active" })
      : Promise.resolve([]),
    seo.sitemapCategories
      ? fetchAllSlugs("categories", storeId, { is_active: true })
      : Promise.resolve([]),
    seo.sitemapBlog
      ? fetchPublishedBlogPostSlugs(storeId)
      : Promise.resolve([]),
  ]);

  for (const product of products) {
    entries.push({
      url: absoluteUrl(`/products/${product.slug}`, seo.siteOrigin),
      lastModified: product.updated_at ?? undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const category of categories) {
    if (category.slug === "home") continue;
    entries.push({
      url: absoluteUrl(`/categories/${category.slug}`, seo.siteOrigin),
      lastModified: category.updated_at ?? undefined,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // System CMS pages (about, career, legal) are listed via Menu & Navigation
  // sitemap paths — no separate /pages/{slug} URLs.

  for (const post of blogPosts) {
    entries.push({
      url: absoluteUrl(`/blog/${post.slug}`, seo.siteOrigin),
      lastModified: post.updated_at ?? undefined,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}

async function fetchPublishedBlogPostSlugs(
  storeId: string,
): Promise<Array<{ slug: string; updated_at: string | null }>> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];

  const now = new Date().toISOString();
  const rows: Array<{ slug: string; updated_at: string | null }> = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("store_id", storeId)
      .eq("status", "published")
      .or(`published_at.is.null,published_at.lte.${now}`)
      .order("updated_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data?.length) break;
    for (const row of data) {
      if (row.slug) {
        rows.push({
          slug: row.slug,
          updated_at: row.updated_at ?? row.published_at ?? null,
        });
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}
