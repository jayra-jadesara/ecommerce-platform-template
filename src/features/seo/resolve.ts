/**
 * Pure SEO metadata resolution — values come from DB (store SEO + entity SEO).
 */

import type { SeoConfig, SeoManagedPageKey } from "@/types";
import {
  absoluteUrl,
  isSafePublicAssetUrl,
  resolveSiteOrigin,
} from "@/lib/site-url";

export type ResolvedPageSeo = {
  title: string;
  description: string;
  canonicalPath: string;
  canonicalUrl: string;
  ogImage?: string;
  ogType: "website" | "product" | "article";
  robotsIndex: boolean;
  robotsFollow: boolean;
};

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function siteOrigin(seo: SeoConfig): string {
  return resolveSiteOrigin(seo.canonicalUrl);
}

function abs(path: string, seo: SeoConfig): string {
  return absoluteUrl(path, siteOrigin(seo));
}

function robotsFrom(seo: SeoConfig, index = true, follow = true) {
  return {
    robotsIndex: index && seo.robotsIndex !== false,
    robotsFollow: follow && seo.robotsFollow !== false,
  };
}

export function resolveStoreHomepageSeo(input: {
  seo: SeoConfig;
  brandName?: string;
}): ResolvedPageSeo {
  const brand = input.brandName?.trim() || input.seo.siteName || "Store";
  const title = firstNonEmpty(input.seo.title, brand) || brand;
  const description = firstNonEmpty(input.seo.description);
  const ogImage = isSafePublicAssetUrl(input.seo.ogImage)
    ? input.seo.ogImage
    : undefined;
  return {
    title,
    description,
    canonicalPath: "/",
    canonicalUrl: abs("/", input.seo),
    ogImage,
    ogType: "website",
    ...robotsFrom(input.seo),
  };
}

/** About, Contact, Career, legal, etc. — titles/descriptions from Google & SEO page_seo. */
export function resolveManagedPageSeo(input: {
  seo: SeoConfig;
  pageKey: SeoManagedPageKey;
  path: string;
  fallbackTitle: string;
  fallbackDescription?: string;
}): ResolvedPageSeo {
  const page = input.seo.pages?.[input.pageKey];
  const title =
    firstNonEmpty(page?.title, input.fallbackTitle, input.seo.title) ||
    input.fallbackTitle;
  const description = firstNonEmpty(
    page?.description,
    input.fallbackDescription,
    input.seo.description,
  );
  return {
    title,
    description,
    canonicalPath: input.path,
    canonicalUrl: abs(input.path, input.seo),
    ogImage: isSafePublicAssetUrl(input.seo.ogImage)
      ? input.seo.ogImage
      : undefined,
    ogType: "website",
    ...robotsFrom(input.seo),
  };
}

export function resolveProductSeo(input: {
  product: {
    name: string;
    slug: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    shortDescription?: string | null;
    primaryImageUrl?: string | null;
  };
  seo: SeoConfig;
  brandName?: string;
}): ResolvedPageSeo {
  const brand = input.brandName?.trim() || input.seo.siteName || input.seo.title;
  const title =
    firstNonEmpty(
      input.product.seoTitle,
      input.product.name,
      input.seo.title,
      brand,
    ) || input.product.name;
  const description = firstNonEmpty(
    input.product.seoDescription,
    input.product.shortDescription,
    input.seo.description,
  );
  const path = `/products/${input.product.slug}`;
  const ogImage = isSafePublicAssetUrl(input.product.primaryImageUrl)
    ? input.product.primaryImageUrl!
    : isSafePublicAssetUrl(input.seo.ogImage)
      ? input.seo.ogImage
      : undefined;
  return {
    title,
    description,
    canonicalPath: path,
    canonicalUrl: abs(path, input.seo),
    ogImage,
    ogType: "product",
    ...robotsFrom(input.seo),
  };
}

export function resolveCategorySeo(input: {
  category: {
    name: string;
    slug: string;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    imageUrl?: string | null;
  };
  seo: SeoConfig;
}): ResolvedPageSeo {
  const title = firstNonEmpty(
    input.category.seoTitle,
    input.category.name,
    input.seo.title,
  );
  const description = firstNonEmpty(
    input.category.seoDescription,
    input.category.description,
    input.seo.description,
  );
  const path = `/categories/${input.category.slug}`;
  const ogImage = isSafePublicAssetUrl(input.category.imageUrl)
    ? input.category.imageUrl!
    : isSafePublicAssetUrl(input.seo.ogImage)
      ? input.seo.ogImage
      : undefined;
  return {
    title,
    description,
    canonicalPath: path,
    canonicalUrl: abs(path, input.seo),
    ogImage,
    ogType: "website",
    ...robotsFrom(input.seo),
  };
}

export function resolveCmsPageSeo(input: {
  page: {
    title: string;
    slug: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    ogImageUrl?: string | null;
    status: string;
  };
  seo: SeoConfig;
}): ResolvedPageSeo {
  const published = input.page.status === "published";
  const title = firstNonEmpty(
    input.page.seoTitle,
    input.page.title,
    input.seo.title,
  );
  const description = firstNonEmpty(
    input.page.seoDescription,
    input.seo.description,
  );
  const path = `/pages/${input.page.slug}`;
  const ogImage = isSafePublicAssetUrl(input.page.ogImageUrl)
    ? input.page.ogImageUrl!
    : isSafePublicAssetUrl(input.seo.ogImage)
      ? input.seo.ogImage
      : undefined;
  return {
    title,
    description,
    canonicalPath: path,
    canonicalUrl: abs(path, input.seo),
    ogImage,
    ogType: "article",
    ...robotsFrom(input.seo, published, published),
  };
}

export function resolveProductsListingSeo(input: {
  seo: SeoConfig;
  page?: number;
}): ResolvedPageSeo {
  const page = input.page && input.page > 1 ? input.page : 1;
  const pageSeo = input.seo.pages?.products;
  return {
    title:
      firstNonEmpty(pageSeo?.title, input.seo.title, "Products") || "Products",
    description: firstNonEmpty(pageSeo?.description, input.seo.description),
    canonicalPath: "/products",
    canonicalUrl: abs("/products", input.seo),
    ogImage: isSafePublicAssetUrl(input.seo.ogImage)
      ? input.seo.ogImage
      : undefined,
    ogType: "website",
    ...robotsFrom(input.seo, page <= 1),
  };
}

export function resolveBlogListingSeo(input: {
  settings: {
    pageTitle: string;
    pageDescription: string | null;
  };
  seo: SeoConfig;
  page?: number;
  categorySlug?: string;
  q?: string;
}): ResolvedPageSeo {
  const page = input.page && input.page > 1 ? input.page : 1;
  const hasFilter = Boolean(input.categorySlug?.trim() || input.q?.trim());
  const pageSeo = input.seo.pages?.blog;
  const title =
    firstNonEmpty(
      pageSeo?.title,
      input.settings.pageTitle,
      input.seo.title,
      input.seo.siteName,
    ) || "Blog";
  const description = firstNonEmpty(
    pageSeo?.description,
    input.settings.pageDescription,
    input.seo.description,
  );
  return {
    title,
    description,
    canonicalPath: "/blog",
    canonicalUrl: abs("/blog", input.seo),
    ogImage: isSafePublicAssetUrl(input.seo.ogImage)
      ? input.seo.ogImage
      : undefined,
    ogType: "website",
    ...robotsFrom(input.seo, page <= 1 && !hasFilter),
  };
}

export function resolveBlogPostSeo(input: {
  post: {
    title: string;
    slug: string;
    excerpt?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    featuredImageUrl?: string | null;
    ogImageUrl?: string | null;
    status?: string;
  };
  seo: SeoConfig;
  brandName?: string;
}): ResolvedPageSeo {
  const brand = input.brandName?.trim() || input.seo.siteName || input.seo.title;
  const title =
    firstNonEmpty(
      input.post.seoTitle,
      input.post.title,
      input.seo.title,
      brand,
    ) || input.post.title;
  const description = firstNonEmpty(
    input.post.seoDescription,
    input.post.excerpt,
    input.seo.description,
  );
  const path = `/blog/${input.post.slug}`;
  const ogImage = isSafePublicAssetUrl(input.post.ogImageUrl)
    ? input.post.ogImageUrl!
    : isSafePublicAssetUrl(input.post.featuredImageUrl)
      ? input.post.featuredImageUrl!
      : isSafePublicAssetUrl(input.seo.ogImage)
        ? input.seo.ogImage
        : undefined;
  const published = !input.post.status || input.post.status === "published";
  return {
    title,
    description,
    canonicalPath: path,
    canonicalUrl: abs(path, input.seo),
    ogImage,
    ogType: "article",
    ...robotsFrom(input.seo, published, published),
  };
}
