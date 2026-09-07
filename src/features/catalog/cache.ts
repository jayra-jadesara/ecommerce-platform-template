export const CATALOG_CACHE_TAG = "catalog";
export const CATALOG_PRODUCTS_TAG = "catalog-products";
export const CATALOG_CATEGORIES_TAG = "catalog-categories";

export function productCacheTag(productIdOrSlug: string): string {
  return `catalog-product:${productIdOrSlug}`;
}

export function categoryCacheTag(categoryIdOrSlug: string): string {
  return `catalog-category:${categoryIdOrSlug}`;
}
