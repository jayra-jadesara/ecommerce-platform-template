import "server-only";

import { unstable_cache } from "next/cache";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  pageCacheTag,
  STOREFRONT_BANNERS_CACHE_TAG,
  STOREFRONT_HOMEPAGE_CACHE_TAG,
  STOREFRONT_PAGES_CACHE_TAG,
} from "@/features/cms/cache";
import {
  ABOUT_PAGE_SLUG,
  CAREER_PAGE_SLUG,
  HOMEPAGE_SLUG,
  isLegalPageSlug,
  LEGAL_PAGE_META,
  LEGAL_PAGE_SLUGS,
  parseSectionConfig,
  type LegalPageSlug,
  type SectionConfigMap,
  type SupportedSectionType,
} from "@/features/cms/schemas";
import type { BannerRow, ContentPage, ParsedContentSection } from "@/features/cms/types";
import { listStorefrontCategories, listStorefrontProducts } from "@/features/catalog/storefront";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { Tables } from "@/types/database";
import type { NavItem } from "@/types";

function mapPage(row: Tables<"pages">): ContentPage {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    status: row.status,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    featuredImagePath: row.featured_image_path ?? null,
    ogImagePath: row.og_image_path ?? null,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBanner(row: Tables<"banners">): BannerRow {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    description: row.description,
    imagePath: row.image_path,
    linkUrl: row.link_url,
    buttonText: row.button_text,
    isActive: row.is_active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type StorefrontSection = ParsedContentSection & {
  /** Resolved catalog payloads for product/category sections. */
  resolved?: {
    products?: Awaited<ReturnType<typeof listStorefrontProducts>>["items"];
    categories?: Awaited<ReturnType<typeof listStorefrontCategories>>;
  };
};

export type StorefrontPagePayload = {
  page: ContentPage;
  sections: StorefrontSection[];
};

async function loadPublishedPageUncached(
  storeId: string,
  slug: string,
): Promise<StorefrontPagePayload | null> {
  // Public anon client — must not call cookies() inside unstable_cache.
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;
  const { data: pageRow } = await supabase
    .from("pages")
    .select("*")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!pageRow) return null;

  const { data: sectionRows } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page_id", pageRow.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const sections: StorefrontSection[] = [];
  for (const row of sectionRows ?? []) {
    const parsed = parseSectionConfig(row.section_type, row.config);
    if (!parsed.ok) {
      // Keep unsupported/custom rows out of the storefront without aborting the page.
      continue;
    }
    sections.push({
      id: row.id,
      pageId: row.page_id,
      sectionType: parsed.type,
      title: row.title,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      config: parsed.config as SectionConfigMap[SupportedSectionType],
    });
  }

  // Resolve catalog data once for product/category sections.
  for (const section of sections) {
    if (section.sectionType === "categories") {
      const cfg = section.config as SectionConfigMap["categories"];
      const all = await listStorefrontCategories();
      const filtered =
        cfg.categoryIds.length > 0
          ? all.filter((c) => cfg.categoryIds.includes(c.id))
          : all.slice(0, 12);
      section.resolved = { categories: filtered };
    }
    if (section.sectionType === "products") {
      const cfg = section.config as SectionConfigMap["products"];
      let items: Awaited<ReturnType<typeof listStorefrontProducts>>["items"] = [];
      if (cfg.source === "FEATURED_PRODUCTS") {
        const result = await listStorefrontProducts({
          featured: "true",
          pageSize: cfg.limit,
          sort: "featured",
        });
        items = result.items;
      } else if (cfg.source === "LATEST_PRODUCTS") {
        const result = await listStorefrontProducts({
          pageSize: cfg.limit,
          sort: "newest",
        });
        items = result.items;
      } else if (cfg.source === "CATEGORY_PRODUCTS" && cfg.categoryId) {
        const result = await listStorefrontProducts({
          categoryId: cfg.categoryId,
          pageSize: cfg.limit,
          sort: "newest",
        });
        items = result.items;
      } else if (cfg.source === "SELECTED_PRODUCTS" && cfg.productIds.length) {
        const result = await listStorefrontProducts({
          pageSize: 48,
          sort: "newest",
        });
        const map = new Map(result.items.map((p) => [p.id, p]));
        items = cfg.productIds
          .map((id) => map.get(id))
          .filter(Boolean)
          .slice(0, cfg.limit) as typeof items;
      }
      section.resolved = { products: items };
    }
  }

  return { page: mapPage(pageRow), sections };
}

export async function getPublishedStorefrontPage(
  slug: string,
): Promise<StorefrontPagePayload | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;

  // About & legal pages are edited often in admin — skip Data Cache so publish/save shows immediately.
  if (
    slug === ABOUT_PAGE_SLUG ||
    slug === CAREER_PAGE_SLUG ||
    isLegalPageSlug(slug)
  ) {
    return loadPublishedPageUncached(storeId, slug);
  }

  const cached = unstable_cache(
    () => loadPublishedPageUncached(storeId, slug),
    ["storefront-page", storeId, slug],
    {
      revalidate: 60,
      tags: [
        STOREFRONT_PAGES_CACHE_TAG,
        pageCacheTag(slug),
        ...(slug === HOMEPAGE_SLUG ? [STOREFRONT_HOMEPAGE_CACHE_TAG] : []),
      ],
    },
  );

  return cached();
}

export async function getPublishedHomepage(): Promise<StorefrontPagePayload | null> {
  return getPublishedStorefrontPage(HOMEPAGE_SLUG);
}

/** Legal page for storefront: title always from admin; body only when published. */
export type LegalStorefrontPage = {
  slug: LegalPageSlug;
  title: string;
  content: string | null;
  published: boolean;
};

export async function getLegalStorefrontPage(
  slug: LegalPageSlug,
): Promise<LegalStorefrontPage> {
  const meta = LEGAL_PAGE_META[slug];
  const fallback: LegalStorefrontPage = {
    slug,
    title: meta.title,
    content: null,
    published: false,
  };

  const storeId = await resolveActiveStoreId();
  if (!storeId) return fallback;

  const supabase = createSupabasePublicClient();
  if (!supabase) return fallback;

  const { data } = await supabase
    .from("pages")
    .select("title, content, status")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return fallback;

  const published = data.status === "published";
  return {
    slug,
    title: data.title?.trim() || meta.title,
    content: published ? data.content?.trim() || null : null,
    published,
  };
}

/**
 * Published legal pages keyed by storefront path (`/privacy`, …) → admin title.
 * Used to show/hide and relabel footer (and similar) legal links.
 */
export async function getPublishedLegalLinkMap(): Promise<
  Map<string, string>
> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return new Map();

  const supabase = createSupabasePublicClient();
  if (!supabase) return new Map();

  const { data } = await supabase
    .from("pages")
    .select("slug, title")
    .eq("store_id", storeId)
    .eq("status", "published")
    .in("slug", [...LEGAL_PAGE_SLUGS]);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (!isLegalPageSlug(row.slug)) continue;
    const path = LEGAL_PAGE_META[row.slug].storefrontPath;
    map.set(path, row.title?.trim() || LEGAL_PAGE_META[row.slug].title);
  }
  return map;
}

function normalizeNavHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return trimmed;
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).pathname.replace(/\/$/, "") || "/";
    }
  } catch {
    // keep as-is
  }
  const path = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

const LEGAL_FOOTER_PATHS = new Set(
  LEGAL_PAGE_SLUGS.map((slug) => LEGAL_PAGE_META[slug].storefrontPath),
);

/** Drop unpublished/archived legal links; rename published ones to the admin title. */
export function applyLegalLinksToNav(
  items: NavItem[],
  publishedLegal: Map<string, string>,
): NavItem[] {
  const next: NavItem[] = [];
  for (const item of items) {
    const path = normalizeNavHref(item.href);
    const children = item.children
      ? applyLegalLinksToNav(item.children, publishedLegal)
      : undefined;

    if (LEGAL_FOOTER_PATHS.has(path)) {
      const title = publishedLegal.get(path);
      if (!title) continue;
      next.push({
        ...item,
        label: title,
        ...(children?.length ? { children } : {}),
      });
      continue;
    }

    next.push({
      ...item,
      ...(children ? { children } : {}),
    });
  }
  return next;
}

async function loadActiveBannersUncached(storeId: string): Promise<BannerRow[]> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("banners")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (data ?? [])
    .filter((row) => {
      if (row.starts_at && row.starts_at > now) return false;
      if (row.ends_at && row.ends_at < now) return false;
      return true;
    })
    .map(mapBanner);
}

export async function getActiveStorefrontBanners(): Promise<BannerRow[]> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];

  const cached = unstable_cache(
    () => loadActiveBannersUncached(storeId),
    ["storefront-banners", storeId],
    { revalidate: 60, tags: [STOREFRONT_BANNERS_CACHE_TAG] },
  );
  return cached();
}
