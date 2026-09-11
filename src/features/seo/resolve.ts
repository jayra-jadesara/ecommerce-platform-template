/**
 * Pure SEO metadata resolution — no invented marketing copy.
 */

import type { SeoConfig } from "@/types";
import {
  absoluteUrl,
  isSafePublicAssetUrl,
  resolveTrustedSiteUrl,
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

export function resolveStoreHomepageSeo(input: {
  seo: SeoConfig;
  brandName?: string;
}): ResolvedPageSeo {
  const brand = input.brandName?.trim() || input.seo.siteName || "Store";
  const title = firstNonEmpty(input.seo.title, brand) || brand;
  const description = firstNonEmpty(input.seo.description) || "";
  const ogImage = isSafePublicAssetUrl(input.seo.ogImage)
    ? input.seo.ogImage
    : undefined;
  return {
    title,
    description,
    canonicalPath: "/",
    canonicalUrl: absoluteUrl("/", resolveTrustedSiteUrl()),
    ogImage,
    ogType: "website",
    robotsIndex: input.seo.robotsIndex !== false,
    robotsFollow: input.seo.robotsFollow !== false,
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
    firstNonEmpty(input.product.seoTitle, input.product.name, input.seo.title, brand) ||
    input.product.name;
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
    canonicalUrl: absoluteUrl(path),
    ogImage,
    ogType: "product",
    robotsIndex: input.seo.robotsIndex !== false,
    robotsFollow: input.seo.robotsFollow !== false,
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
    canonicalUrl: absoluteUrl(path),
    ogImage,
    ogType: "website",
    robotsIndex: input.seo.robotsIndex !== false,
    robotsFollow: input.seo.robotsFollow !== false,
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
  const title = firstNonEmpty(input.page.seoTitle, input.page.title, input.seo.title);
  const description = firstNonEmpty(input.page.seoDescription, input.seo.description);
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
    canonicalUrl: absoluteUrl(path),
    ogImage,
    ogType: "article",
    robotsIndex: published && input.seo.robotsIndex !== false,
    robotsFollow: published && input.seo.robotsFollow !== false,
  };
}

/** Listing pages: prefer canonical without page query when page>1 still points at listing. */
export function resolveProductsListingSeo(input: {
  seo: SeoConfig;
  page?: number;
}): ResolvedPageSeo {
  const page = input.page && input.page > 1 ? input.page : 1;
  return {
    title: firstNonEmpty(input.seo.title) || "Products",
    description: firstNonEmpty(input.seo.description),
    canonicalPath: "/products",
    canonicalUrl: absoluteUrl("/products"),
    ogImage: isSafePublicAssetUrl(input.seo.ogImage) ? input.seo.ogImage : undefined,
    ogType: "website",
    // Paginated pages: index only page 1 to reduce duplicates
    robotsIndex: page <= 1 && input.seo.robotsIndex !== false,
    robotsFollow: input.seo.robotsFollow !== false,
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
  const title =
    firstNonEmpty(input.settings.pageTitle, input.seo.title, input.seo.siteName) ||
    "Blog";
  const description = firstNonEmpty(
    input.settings.pageDescription,
    input.seo.description,
  );
  return {
    title,
    description,
    canonicalPath: "/blog",
    canonicalUrl: absoluteUrl("/blog"),
    ogImage: isSafePublicAssetUrl(input.seo.ogImage) ? input.seo.ogImage : undefined,
    ogType: "website",
    robotsIndex:
      page <= 1 && !hasFilter && input.seo.robotsIndex !== false,
    robotsFollow: input.seo.robotsFollow !== false,
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
    firstNonEmpty(input.post.seoTitle, input.post.title, input.seo.title, brand) ||
    input.post.title;
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
  const published =
    !input.post.status || input.post.status === "published";
  return {
    title,
    description,
    canonicalPath: path,
    canonicalUrl: absoluteUrl(path),
    ogImage,
    ogType: "article",
    robotsIndex: published && input.seo.robotsIndex !== false,
    robotsFollow: published && input.seo.robotsFollow !== false,
  };
}
