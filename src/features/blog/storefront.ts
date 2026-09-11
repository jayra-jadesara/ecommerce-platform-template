import "server-only";

import { unstable_cache } from "next/cache";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  blogCategoryCacheTag,
  blogPostCacheTag,
  STOREFRONT_BLOG_CACHE_TAG,
} from "@/features/blog/cache";
import { DEFAULT_BLOG_SETTINGS } from "@/features/blog/schemas";
import { isPubliclyVisiblePost } from "@/features/blog/sanitize";
import { mapBlogSettingsRow } from "@/features/blog/settings-map";
import { wantsFeaturedBlock } from "@/features/blog/settings-normalize";
import type {
  BlogSettings,
  StorefrontBlogCategory,
  StorefrontBlogPost,
  StorefrontBlogPostSummary,
} from "@/features/blog/types";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import type { Tables } from "@/types/database";

function mapSettings(row: Tables<"blog_settings">): BlogSettings {
  return mapBlogSettingsRow(row);
}

function fallbackSettings(storeId: string): BlogSettings {
  return {
    storeId,
    ...DEFAULT_BLOG_SETTINGS,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function featuredImageUrl(path: string | null): string | null {
  return (
    resolvePublicStorageUrl("media", path) ??
    resolvePublicStorageUrl("cms", path) ??
    null
  );
}

type CategoryJoin = {
  category_id: string;
  blog_categories:
    | { id: string; name: string; slug: string; is_active?: boolean }
    | { id: string; name: string; slug: string; is_active?: boolean }[]
    | null;
};

function extractCategories(
  joins: CategoryJoin[] | null | undefined,
): Array<{ id: string; name: string; slug: string }> {
  if (!joins?.length) return [];
  const out: Array<{ id: string; name: string; slug: string }> = [];
  for (const join of joins) {
    const raw = join.blog_categories;
    const cat = Array.isArray(raw) ? raw[0] : raw;
    if (!cat) continue;
    if (cat.is_active === false) continue;
    out.push({ id: cat.id, name: cat.name, slug: cat.slug });
  }
  return out;
}

type PostWithCategories = Tables<"blog_posts"> & {
  blog_post_categories?: CategoryJoin[] | null;
};

function asPostWithCategories(row: unknown): PostWithCategories {
  return row as PostWithCategories;
}

function mapSummary(row: PostWithCategories): StorefrontBlogPostSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    authorName: row.author_name,
    publishedAt: row.published_at,
    readingTimeMinutes: row.reading_time_minutes,
    isFeatured: row.is_featured,
    featuredImagePath: row.featured_image_path,
    featuredImageUrl: featuredImageUrl(row.featured_image_path),
    categories: extractCategories(row.blog_post_categories),
  };
}

const POST_SELECT = `
  *,
  blog_post_categories (
    category_id,
    blog_categories ( id, name, slug, is_active )
  )
`;

function publishedFilterNow(): string {
  return new Date().toISOString();
}

async function loadBlogSettingsUncached(
  storeId: string,
): Promise<BlogSettings> {
  const supabase = createSupabasePublicClient();
  if (!supabase) {
    return fallbackSettings(storeId);
  }

  const { data } = await supabase
    .from("blog_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  if (data) return mapSettings(data);

  return fallbackSettings(storeId);
}

export async function getBlogSettingsCached(): Promise<BlogSettings | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;

  const cached = unstable_cache(
    () => loadBlogSettingsUncached(storeId),
    ["storefront-blog-settings", storeId],
    { revalidate: 60, tags: [STOREFRONT_BLOG_CACHE_TAG] },
  );
  return cached();
}

export type ListPublishedBlogPostsInput = {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
  q?: string;
};

export type ListPublishedBlogPostsResult = {
  items: StorefrontBlogPostSummary[];
  total: number;
  page: number;
  pageSize: number;
};

async function listPublishedBlogPostsUncached(
  storeId: string,
  input: Required<ListPublishedBlogPostsInput>,
): Promise<ListPublishedBlogPostsResult> {
  const empty: ListPublishedBlogPostsResult = {
    items: [],
    total: 0,
    page: input.page,
    pageSize: input.pageSize,
  };

  const supabase = createSupabasePublicClient();
  if (!supabase) return empty;

  const now = publishedFilterNow();
  let postIds: string[] | null = null;

  if (input.categorySlug) {
    const { data: category } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("store_id", storeId)
      .eq("slug", input.categorySlug)
      .eq("is_active", true)
      .maybeSingle();

    if (!category) return empty;

    const { data: links } = await supabase
      .from("blog_post_categories")
      .select("post_id")
      .eq("store_id", storeId)
      .eq("category_id", category.id);

    postIds = (links ?? []).map((l) => l.post_id);
    if (!postIds.length) return empty;
  }

  let builder = supabase
    .from("blog_posts")
    .select(POST_SELECT, { count: "exact" })
    .eq("store_id", storeId)
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (postIds) builder = builder.in("id", postIds);
  if (input.q.trim()) {
    const term = `%${input.q.trim().replace(/[%_,]/g, "")}%`;
    builder = builder.or(
      `title.ilike.${term},excerpt.ilike.${term},content.ilike.${term}`,
    );
  }

  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;
  const { data, count, error } = await builder.range(from, to);
  if (error || !data) return empty;

  const items = data
    .filter((row) =>
      isPubliclyVisiblePost(row.status, row.published_at, new Date(now)),
    )
    .map((row) => mapSummary(asPostWithCategories(row)));

  return {
    items,
    total: count ?? items.length,
    page: input.page,
    pageSize: input.pageSize,
  };
}

export async function listPublishedBlogPosts(
  input: ListPublishedBlogPostsInput = {},
): Promise<ListPublishedBlogPostsResult> {
  const storeId = await resolveActiveStoreId();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, input.pageSize ?? 9));
  const categorySlug = input.categorySlug?.trim() || "";
  const q = input.q?.trim() || "";

  if (!storeId) {
    return { items: [], total: 0, page, pageSize };
  }

  const cached = unstable_cache(
    () =>
      listPublishedBlogPostsUncached(storeId, {
        page,
        pageSize,
        categorySlug,
        q,
      }),
    [
      "storefront-blog-list",
      storeId,
      String(page),
      String(pageSize),
      categorySlug,
      q,
    ],
    {
      revalidate: 60,
      tags: [
        STOREFRONT_BLOG_CACHE_TAG,
        ...(categorySlug ? [blogCategoryCacheTag(categorySlug)] : []),
      ],
    },
  );

  return cached();
}

async function getPublishedBlogPostBySlugUncached(
  storeId: string,
  slug: string,
): Promise<StorefrontBlogPost | null> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;

  const now = publishedFilterNow();
  const { data } = await supabase
    .from("blog_posts")
    .select(
      `
      ${POST_SELECT},
      blog_post_products ( product_id, sort_order )
    `,
    )
    .eq("store_id", storeId)
    .eq("slug", slug)
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${now}`)
    .maybeSingle();

  if (!data) return null;
  if (!isPubliclyVisiblePost(data.status, data.published_at, new Date(now))) {
    return null;
  }

  const typed = data as unknown as PostWithCategories & {
    blog_post_products?: Array<{ product_id: string; sort_order: number }>;
  };
  const productIds = [...(typed.blog_post_products ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => p.product_id);

  return {
    ...mapSummary(typed),
    content: typed.content,
    seoTitle: typed.seo_title,
    seoDescription: typed.seo_description,
    ogImagePath: typed.og_image_path,
    productIds,
  };
}

export async function getPublishedBlogPostBySlug(
  slug: string,
): Promise<StorefrontBlogPost | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId || !slug.trim()) return null;

  const cached = unstable_cache(
    () => getPublishedBlogPostBySlugUncached(storeId, slug),
    ["storefront-blog-post", storeId, slug],
    {
      revalidate: 60,
      tags: [STOREFRONT_BLOG_CACHE_TAG, blogPostCacheTag(slug)],
    },
  );
  return cached();
}

async function listActiveBlogCategoriesWithCountsUncached(
  storeId: string,
): Promise<StorefrontBlogCategory[]> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];

  const now = publishedFilterNow();
  const { data: categories } = await supabase
    .from("blog_categories")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!categories?.length) return [];

  const { data: publishedPosts } = await supabase
    .from("blog_posts")
    .select("id")
    .eq("store_id", storeId)
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${now}`);

  const publishedIds = new Set((publishedPosts ?? []).map((p) => p.id));
  if (!publishedIds.size) {
    return categories.map((row) => ({
      id: row.id,
      storeId: row.store_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      imagePath: row.image_path,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      postCount: 0,
      imageUrl: featuredImageUrl(row.image_path),
    }));
  }

  const { data: links } = await supabase
    .from("blog_post_categories")
    .select("category_id, post_id")
    .eq("store_id", storeId)
    .in("post_id", [...publishedIds]);

  const counts = new Map<string, number>();
  for (const link of links ?? []) {
    if (!publishedIds.has(link.post_id)) continue;
    counts.set(link.category_id, (counts.get(link.category_id) ?? 0) + 1);
  }

  return categories.map((row) => ({
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imagePath: row.image_path,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    postCount: counts.get(row.id) ?? 0,
    imageUrl: featuredImageUrl(row.image_path),
  }));
}

export async function listActiveBlogCategoriesWithCounts(): Promise<
  StorefrontBlogCategory[]
> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];

  const cached = unstable_cache(
    () => listActiveBlogCategoriesWithCountsUncached(storeId),
    ["storefront-blog-categories", storeId],
    { revalidate: 60, tags: [STOREFRONT_BLOG_CACHE_TAG] },
  );
  return cached();
}

async function getPublishedPostByIdUncached(
  storeId: string,
  postId: string,
): Promise<StorefrontBlogPostSummary | null> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;
  const now = publishedFilterNow();
  const { data } = await supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .eq("store_id", storeId)
    .eq("id", postId)
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${now}`)
    .maybeSingle();
  if (!data) return null;
  if (!isPubliclyVisiblePost(data.status, data.published_at, new Date(now))) {
    return null;
  }
  return mapSummary(asPostWithCategories(data));
}

async function getLatestPublishedPostUncached(
  storeId: string,
): Promise<StorefrontBlogPostSummary | null> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;
  const now = publishedFilterNow();
  const { data } = await supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .eq("store_id", storeId)
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  if (!isPubliclyVisiblePost(data.status, data.published_at, new Date(now))) {
    return null;
  }
  return mapSummary(asPostWithCategories(data));
}

async function getFeaturedBlogPostUncached(
  storeId: string,
  settings: BlogSettings,
): Promise<StorefrontBlogPostSummary | null> {
  if (!wantsFeaturedBlock(settings)) return null;

  if (settings.featuredPostId) {
    const selected = await getPublishedPostByIdUncached(
      storeId,
      settings.featuredPostId,
    );
    if (selected) return selected;
  }

  const supabase = createSupabasePublicClient();
  if (!supabase) return null;

  const now = publishedFilterNow();
  const { data } = await supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .eq("store_id", storeId)
    .eq("status", "published")
    .eq("is_featured", true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (data) {
    if (isPubliclyVisiblePost(data.status, data.published_at, new Date(now))) {
      return mapSummary(asPostWithCategories(data));
    }
  }

  if (settings.autoFeaturedFallback) {
    return getLatestPublishedPostUncached(storeId);
  }

  return null;
}

export async function getFeaturedBlogPost(
  settings?: BlogSettings | null,
): Promise<StorefrontBlogPostSummary | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;

  const resolvedSettings =
    settings ?? (await loadBlogSettingsUncached(storeId));

  const cacheKey = [
    "storefront-blog-featured",
    storeId,
    resolvedSettings.featuredPostId ?? "",
    String(resolvedSettings.showFeaturedPost),
    String(resolvedSettings.autoFeaturedFallback),
    resolvedSettings.layoutPreset,
  ];

  const cached = unstable_cache(
    () => getFeaturedBlogPostUncached(storeId, resolvedSettings),
    cacheKey,
    { revalidate: 60, tags: [STOREFRONT_BLOG_CACHE_TAG] },
  );
  return cached();
}

async function listRelatedBlogPostsUncached(
  storeId: string,
  postId: string,
  categoryIds: string[],
  limit: number,
): Promise<StorefrontBlogPostSummary[]> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];

  const now = publishedFilterNow();
  const collected: StorefrontBlogPostSummary[] = [];
  const seen = new Set<string>([postId]);

  if (categoryIds.length) {
    const { data: links } = await supabase
      .from("blog_post_categories")
      .select("post_id")
      .eq("store_id", storeId)
      .in("category_id", categoryIds)
      .neq("post_id", postId);

    const relatedIds = [...new Set((links ?? []).map((l) => l.post_id))];
    if (relatedIds.length) {
      const { data } = await supabase
        .from("blog_posts")
        .select(POST_SELECT)
        .eq("store_id", storeId)
        .eq("status", "published")
        .or(`published_at.is.null,published_at.lte.${now}`)
        .in("id", relatedIds)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(limit);

      for (const row of data ?? []) {
        if (!isPubliclyVisiblePost(row.status, row.published_at, new Date(now))) {
          continue;
        }
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        collected.push(mapSummary(asPostWithCategories(row)));
        if (collected.length >= limit) return collected;
      }
    }
  }

  if (collected.length >= limit) return collected;

  const { data: recent } = await supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .eq("store_id", storeId)
    .eq("status", "published")
    .neq("id", postId)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit * 2);

  for (const row of recent ?? []) {
    if (!isPubliclyVisiblePost(row.status, row.published_at, new Date(now))) {
      continue;
    }
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    collected.push(mapSummary(asPostWithCategories(row)));
    if (collected.length >= limit) break;
  }

  return collected;
}

export async function listRelatedBlogPosts(
  postId: string,
  categoryIds: string[],
  limit = 3,
): Promise<StorefrontBlogPostSummary[]> {
  const storeId = await resolveActiveStoreId();
  if (!storeId || !postId) return [];

  const safeLimit = Math.min(12, Math.max(1, limit));
  const sortedCats = [...categoryIds].sort().join(",");

  const cached = unstable_cache(
    () =>
      listRelatedBlogPostsUncached(storeId, postId, categoryIds, safeLimit),
    ["storefront-blog-related", storeId, postId, sortedCats, String(safeLimit)],
    { revalidate: 60, tags: [STOREFRONT_BLOG_CACHE_TAG] },
  );
  return cached();
}
