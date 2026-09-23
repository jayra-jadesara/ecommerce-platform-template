export const STOREFRONT_HOMEPAGE_CACHE_TAG = "storefront-homepage";
export const STOREFRONT_PAGES_CACHE_TAG = "storefront-pages";
export const STOREFRONT_BANNERS_CACHE_TAG = "storefront-banners";
export const STOREFRONT_REELS_CACHE_TAG = "storefront-reels";

export function pageCacheTag(slug: string): string {
  return `storefront-page:${slug}`;
}
