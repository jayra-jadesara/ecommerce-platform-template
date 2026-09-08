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
  HOMEPAGE_SLUG,
  parseSectionConfig,
  type SectionConfigMap,
  type SupportedSectionType,
} from "@/features/cms/schemas";
import type { BannerRow, ContentPage, ParsedContentSection } from "@/features/cms/types";
import { listStorefrontCategories, listStorefrontProducts } from "@/features/catalog/storefront";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

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
  const supabase = await createSupabaseServerClient();
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
    if (!parsed.ok) continue;
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

async function loadActiveBannersUncached(storeId: string): Promise<BannerRow[]> {
  const supabase = await createSupabaseServerClient();
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
