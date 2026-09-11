export const STOREFRONT_BLOG_CACHE_TAG = "storefront-blog";

export function blogPostCacheTag(slug: string): string {
  return `storefront-blog-post:${slug}`;
}

export function blogCategoryCacheTag(slug: string): string {
  return `storefront-blog-category:${slug}`;
}

/**
 * Revalidate with Next.js `revalidateTag`:
 *   revalidateTag(STOREFRONT_BLOG_CACHE_TAG, "max");
 *   revalidateTag(blogPostCacheTag(slug), "max");
 *   revalidateTag(blogCategoryCacheTag(slug), "max");
 */
export function revalidateBlogTagsHint(): string {
  return "Use revalidateTag(STOREFRONT_BLOG_CACHE_TAG) plus post/category tags.";
}
