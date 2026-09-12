import "server-only";

import { revalidateTag } from "next/cache";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import { writeBlogAudit } from "@/features/blog/audit";
import {
  blogPostCacheTag,
  STOREFRONT_BLOG_CACHE_TAG,
} from "@/features/blog/cache";
import {
  blogListQuerySchema,
  DEFAULT_BLOG_POST_FORM,
  type BlogListQuery,
  type BlogPostFormValues,
  blogPostFormSchema,
} from "@/features/blog/schemas";
import {
  estimateReadingMinutes,
  stripUnsafeContent,
} from "@/features/blog/sanitize";
import type {
  AdminBlogPostListItem,
  BlogPost,
  BlogPostStatus,
  BlogProductOption,
} from "@/features/blog/types";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodValidationFailure, type FieldErrors } from "@/lib/validation";
import type { Tables } from "@/types/database";

function mapPostRow(
  row: Tables<"blog_posts">,
  categoryIds: string[] = [],
  productIds: string[] = [],
): BlogPost {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    featuredImagePath: row.featured_image_path,
    authorName: row.author_name,
    status: row.status,
    isFeatured: row.is_featured,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    ogImagePath: row.og_image_path,
    publishedAt: row.published_at,
    readingTimeMinutes: row.reading_time_minutes,
    categoryIds,
    productIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function revalidateBlogPosts(slug?: string) {
  revalidateTag(STOREFRONT_BLOG_CACHE_TAG, "max");
  if (slug) revalidateTag(blogPostCacheTag(slug), "max");
}

export function toBlogPostFormValues(post: BlogPost): BlogPostFormValues {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content ?? "",
    featuredImagePath: post.featuredImagePath,
    authorName: post.authorName,
    status: post.status,
    isFeatured: post.isFeatured,
    publishedAt: post.publishedAt,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    ogImagePath: post.ogImagePath,
    categoryIds: post.categoryIds,
    productIds: post.productIds,
  };
}

export type BlogPostMutationResult =
  | { ok: true; post: BlogPost; message?: string; id?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export type AdminBlogPostListResult = {
  items: AdminBlogPostListItem[];
  total: number;
  page: number;
  pageSize: number;
  query: BlogListQuery;
};

async function loadCategoryIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  postId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("blog_post_categories")
    .select("category_id")
    .eq("post_id", postId);
  return (data ?? []).map((row) => row.category_id);
}

async function loadProductIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  postId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("blog_post_products")
    .select("product_id")
    .eq("post_id", postId)
    .order("sort_order", { ascending: true });
  return (data ?? []).map((row) => row.product_id);
}

async function syncPostCategories(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  storeId: string,
  postId: string,
  categoryIds: string[],
) {
  await supabase.from("blog_post_categories").delete().eq("post_id", postId);
  if (categoryIds.length === 0) return;
  await supabase.from("blog_post_categories").insert(
    categoryIds.map((categoryId) => ({
      post_id: postId,
      category_id: categoryId,
      store_id: storeId,
    })),
  );
}

async function syncPostProducts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  storeId: string,
  postId: string,
  productIds: string[],
) {
  await supabase.from("blog_post_products").delete().eq("post_id", postId);
  if (productIds.length === 0) return;
  await supabase.from("blog_post_products").insert(
    productIds.map((productId, index) => ({
      post_id: postId,
      product_id: productId,
      store_id: storeId,
      sort_order: index,
    })),
  );
}

function resolvePublishedAt(
  status: BlogPostStatus,
  publishedAt: string | null,
  previousPublishedAt: string | null,
): string | null {
  if (status === "published") {
    return publishedAt ?? previousPublishedAt ?? new Date().toISOString();
  }
  return publishedAt ?? previousPublishedAt;
}

export async function listAdminBlogPosts(
  rawQuery: unknown = {},
): Promise<AdminBlogPostListResult> {
  const parsed = blogListQuerySchema.safeParse(rawQuery);
  const query = parsed.success ? parsed.data : blogListQuerySchema.parse({});

  const empty: AdminBlogPostListResult = {
    items: [],
    total: 0,
    page: query.page,
    pageSize: query.pageSize,
    query,
  };

  const storeId = await resolveActiveStoreId();
  if (!storeId) return empty;

  const supabase = await createSupabaseServerClient();
  let dbQuery = supabase
    .from("blog_posts")
    .select("*", { count: "exact" })
    .eq("store_id", storeId);

  if (query.q) {
    const term = `%${query.q.replace(/[%_]/g, "")}%`;
    dbQuery = dbQuery.or(
      `title.ilike.${term},slug.ilike.${term},excerpt.ilike.${term},author_name.ilike.${term}`,
    );
  }
  if (query.status !== "all") {
    dbQuery = dbQuery.eq("status", query.status);
  }
  if (query.featured === "yes") {
    dbQuery = dbQuery.eq("is_featured", true);
  } else if (query.featured === "no") {
    dbQuery = dbQuery.eq("is_featured", false);
  }

  if (query.categoryId) {
    const { data: links } = await supabase
      .from("blog_post_categories")
      .select("post_id")
      .eq("store_id", storeId)
      .eq("category_id", query.categoryId);
    const filteredIds = (links ?? []).map((row) => row.post_id);
    if (filteredIds.length === 0) return empty;
    dbQuery = dbQuery.in("id", filteredIds);
  }

  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  const { data, count, error } = await dbQuery
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error || !data) return empty;

  const postIds = data.map((row) => row.id);
  const categoryNameByPost = new Map<string, string[]>();

  if (postIds.length > 0) {
    const { data: links } = await supabase
      .from("blog_post_categories")
      .select("post_id, category_id")
      .eq("store_id", storeId)
      .in("post_id", postIds);

    const categoryIds = [
      ...new Set((links ?? []).map((row) => row.category_id)),
    ];
    const nameById = new Map<string, string>();
    if (categoryIds.length > 0) {
      const { data: cats } = await supabase
        .from("blog_categories")
        .select("id, name")
        .eq("store_id", storeId)
        .in("id", categoryIds);
      for (const cat of cats ?? []) {
        nameById.set(cat.id, cat.name);
      }
    }

    for (const link of links ?? []) {
      const name = nameById.get(link.category_id);
      if (!name) continue;
      const list = categoryNameByPost.get(link.post_id) ?? [];
      list.push(name);
      categoryNameByPost.set(link.post_id, list);
    }
  }

  const items: AdminBlogPostListItem[] = data.map((row) => {
    const names = categoryNameByPost.get(row.id) ?? [];
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      featuredImagePath: row.featured_image_path,
      featuredImageUrl:
        resolvePublicStorageUrl("media", row.featured_image_path) ??
        resolvePublicStorageUrl("cms", row.featured_image_path) ??
        null,
      authorName: row.author_name,
      status: row.status,
      isFeatured: row.is_featured,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      categoryNames: names,
      primaryCategoryName: names[0] ?? null,
    };
  });

  return {
    items,
    total: count ?? items.length,
    page: query.page,
    pageSize: query.pageSize,
    query,
  };
}

export async function getAdminBlogPost(id: string): Promise<BlogPost | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data) return null;
  const [categoryIds, productIds] = await Promise.all([
    loadCategoryIds(supabase, id),
    loadProductIds(supabase, id),
  ]);
  return mapPostRow(data, categoryIds, productIds);
}

export async function listBlogProductOptions(): Promise<BlogProductOption[]> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("id, name")
    .eq("store_id", storeId)
    .neq("status", "archived")
    .order("name", { ascending: true })
    .limit(500);
  return (data ?? []).map((row) => ({ id: row.id, name: row.name }));
}

export async function createAdminBlogPost(
  raw: unknown,
): Promise<BlogPostMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = blogPostFormSchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid post.");
  }

  const values = parsed.data;
  const content = stripUnsafeContent(values.content);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  const readingTime = estimateReadingMinutes(content);
  const publishedAt = resolvePublishedAt(
    values.status,
    values.publishedAt,
    null,
  );

  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      store_id: storeId,
      title: values.title,
      slug: values.slug,
      excerpt: values.excerpt,
      content,
      featured_image_path: values.featuredImagePath,
      author_name: values.authorName,
      status: values.status,
      is_featured: values.isFeatured,
      seo_title: values.seoTitle,
      seo_description: values.seoDescription,
      og_image_path: values.ogImagePath,
      published_at: publishedAt,
      reading_time_minutes: readingTime || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "A post with this URL already exists.",
        fieldErrors: { slug: "A post with this URL already exists." },
      };
    }
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "CREATE_BLOG_POST",
      feature: "BLOG",
      message: error?.message || "Unable to create post",
      error,
      storeId,
      entityType: "blog_post",
      route: "/blog/posts",
    });
  }

  await Promise.all([
    syncPostCategories(supabase, storeId, data.id, values.categoryIds),
    syncPostProducts(supabase, storeId, data.id, values.productIds),
  ]);

  await writeBlogAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BLOG_POST_CREATED",
    entityType: "blog_post",
    entityId: data.id,
    metadata: { slug: values.slug, status: values.status },
  });

  if (values.status === "published") {
    await writeBlogAudit({
      storeId,
      userId: user?.id ?? null,
      action: "BLOG_POST_PUBLISHED",
      entityType: "blog_post",
      entityId: data.id,
    });
  } else if (values.status === "archived") {
    await writeBlogAudit({
      storeId,
      userId: user?.id ?? null,
      action: "BLOG_POST_ARCHIVED",
      entityType: "blog_post",
      entityId: data.id,
    });
  }

  revalidateBlogPosts(values.slug);
  return {
    ok: true,
    post: mapPostRow(data, values.categoryIds, values.productIds),
    message: "Post created.",
    id: data.id,
  };
}

export async function updateAdminBlogPost(
  id: string,
  raw: unknown,
): Promise<BlogPostMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = blogPostFormSchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid post.");
  }

  const values = parsed.data;
  const content = stripUnsafeContent(values.content);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  const { data: current } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Post not found." };

  const wasPublished = current.status === "published";
  const willPublish = values.status === "published";
  const willArchive = values.status === "archived";
  const readingTime = estimateReadingMinutes(content);
  const publishedAt = resolvePublishedAt(
    values.status,
    values.publishedAt,
    current.published_at,
  );

  const { data, error } = await supabase
    .from("blog_posts")
    .update({
      title: values.title,
      slug: values.slug,
      excerpt: values.excerpt,
      content,
      featured_image_path: values.featuredImagePath,
      author_name: values.authorName,
      status: values.status,
      is_featured: values.isFeatured,
      seo_title: values.seoTitle,
      seo_description: values.seoDescription,
      og_image_path: values.ogImagePath,
      published_at: publishedAt,
      reading_time_minutes: readingTime || null,
    })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "A post with this URL already exists.",
        fieldErrors: { slug: "A post with this URL already exists." },
      };
    }
    const operation =
      !wasPublished && willPublish
        ? "PUBLISH_BLOG_POST"
        : wasPublished && !willPublish && values.status === "draft"
          ? "UNPUBLISH_BLOG_POST"
          : willArchive && current.status !== "archived"
            ? "ARCHIVE_BLOG_POST"
            : "UPDATE_BLOG_POST";
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation,
      feature: "BLOG",
      message: error?.message || "Unable to update post",
      error,
      storeId,
      entityType: "blog_post",
      entityId: id,
      route: "/blog/posts",
    });
  }

  await Promise.all([
    syncPostCategories(supabase, storeId, id, values.categoryIds),
    syncPostProducts(supabase, storeId, id, values.productIds),
  ]);

  await writeBlogAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BLOG_POST_UPDATED",
    entityType: "blog_post",
    entityId: data.id,
    metadata: { slug: data.slug, status: data.status },
  });

  if (!wasPublished && willPublish) {
    await writeBlogAudit({
      storeId,
      userId: user?.id ?? null,
      action: "BLOG_POST_PUBLISHED",
      entityType: "blog_post",
      entityId: data.id,
    });
  } else if (wasPublished && !willPublish && values.status === "draft") {
    await writeBlogAudit({
      storeId,
      userId: user?.id ?? null,
      action: "BLOG_POST_UNPUBLISHED",
      entityType: "blog_post",
      entityId: data.id,
    });
  } else if (willArchive && current.status !== "archived") {
    await writeBlogAudit({
      storeId,
      userId: user?.id ?? null,
      action: "BLOG_POST_ARCHIVED",
      entityType: "blog_post",
      entityId: data.id,
    });
  }

  revalidateBlogPosts(current.slug);
  if (data.slug !== current.slug) revalidateBlogPosts(data.slug);

  return {
    ok: true,
    post: mapPostRow(data, values.categoryIds, values.productIds),
    message: "Post saved.",
    id: data.id,
  };
}

export async function setBlogPostStatus(
  id: string,
  status: BlogPostStatus,
): Promise<BlogPostMutationResult> {
  const post = await getAdminBlogPost(id);
  if (!post) return { ok: false, error: "Post not found." };
  return updateAdminBlogPost(id, {
    ...toBlogPostFormValues(post),
    status,
  });
}

export async function deleteAdminBlogPost(
  id: string,
): Promise<BlogPostMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const existing = await getAdminBlogPost(id);
  if (!existing) return { ok: false, error: "Post not found." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  const { error } = await supabase
    .from("blog_posts")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "DELETE_BLOG_POST",
      feature: "BLOG",
      message: error.message || "Unable to delete post",
      error,
      storeId,
      entityType: "blog_post",
      entityId: id,
      route: "/blog/posts",
    });
  }

  await writeBlogAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BLOG_POST_DELETED",
    entityType: "blog_post",
    entityId: id,
    metadata: { slug: existing.slug, title: existing.title },
  });

  revalidateBlogPosts(existing.slug);
  return {
    ok: true,
    post: existing,
    message: "Post deleted.",
    id,
  };
}

export { DEFAULT_BLOG_POST_FORM };
