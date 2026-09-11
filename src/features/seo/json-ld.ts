/**
 * Safe JSON-LD builders — only include fields present in validated data.
 * Never inject raw CMS HTML/JS into structured data.
 */

import { absoluteUrl, isSafePublicAssetUrl } from "@/lib/site-url";
import type { StockStatus } from "@/features/catalog/stock";

export type JsonLd = Record<string, unknown>;

/** Serialize for <script type="application/ld+json"> without XSS breakout. */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function schemaAvailability(status: StockStatus): string {
  switch (status) {
    case "OUT_OF_STOCK":
      return "https://schema.org/OutOfStock";
    case "IN_STOCK":
    case "LOW_STOCK":
    default:
      return "https://schema.org/InStock";
  }
}

export type ProductJsonLdInput = {
  name: string;
  description?: string | null;
  slug: string;
  brand?: string | null;
  images: Array<{ url: string; altText?: string }>;
  currency: string;
  variants: Array<{
    name: string;
    sku: string;
    price: number;
    stockStatus: StockStatus;
  }>;
  category?: { name: string; slug: string } | null;
};

function buildOffers(
  variants: ProductJsonLdInput["variants"],
  currency: string,
  productUrl: string,
): JsonLd | JsonLd[] | null {
  const active = variants.filter((v) => v.sku && Number.isFinite(v.price));
  if (!active.length) return null;

  const prices = active.map((v) => v.price);
  const uniquePrices = new Set(prices.map((p) => p.toFixed(2)));

  if (active.length === 1 || uniquePrices.size === 1) {
    const v = active[0]!;
    return {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: currency,
      price: v.price.toFixed(2),
      availability: schemaAvailability(v.stockStatus),
      sku: v.sku,
      ...(active.length === 1 ? {} : { name: v.name }),
    };
  }

  // Multiple different prices — AggregateOffer avoids a misleading single price
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return {
    "@type": "AggregateOffer",
    url: productUrl,
    priceCurrency: currency,
    lowPrice: low.toFixed(2),
    highPrice: high.toFixed(2),
    offerCount: active.length,
    availability: active.some((v) => v.stockStatus !== "OUT_OF_STOCK")
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    offers: active.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      name: v.name,
      price: v.price.toFixed(2),
      priceCurrency: currency,
      availability: schemaAvailability(v.stockStatus),
      url: productUrl,
    })),
  };
}

export function buildProductJsonLd(input: ProductJsonLdInput): JsonLd {
  const url = absoluteUrl(`/products/${input.slug}`);
  const images = input.images
    .map((img) => img.url)
    .filter((url) => isSafePublicAssetUrl(url));
  const description = input.description?.trim() || undefined;
  const brand = input.brand?.trim();
  const offers = buildOffers(input.variants, input.currency, url);

  const json: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    url,
  };
  if (description) json.description = description;
  if (images.length === 1) json.image = images[0];
  if (images.length > 1) json.image = images;
  if (brand) json.brand = { "@type": "Brand", name: brand };
  if (offers) json.offers = offers;
  return json;
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export type BlogPostingJsonLdInput = {
  title: string;
  description?: string | null;
  slug: string;
  imageUrl?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  authorName?: string | null;
};

export function buildBlogPostingJsonLd(input: BlogPostingJsonLdInput): JsonLd {
  const url = absoluteUrl(`/blog/${input.slug}`);
  const description = input.description?.trim() || undefined;
  const json: JsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
  };
  if (description) json.description = description;
  if (isSafePublicAssetUrl(input.imageUrl)) json.image = input.imageUrl;
  if (input.datePublished?.trim()) json.datePublished = input.datePublished.trim();
  if (input.dateModified?.trim()) json.dateModified = input.dateModified.trim();
  if (input.authorName?.trim()) {
    json.author = {
      "@type": "Person",
      name: input.authorName.trim(),
    };
  }
  return json;
}

export function buildOrganizationJsonLd(input: {
  name: string;
  url: string;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
}): JsonLd {
  const json: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: input.url,
  };
  if (isSafePublicAssetUrl(input.logoUrl)) json.logo = input.logoUrl;
  if (input.email?.trim()) json.email = input.email.trim();
  if (input.phone?.trim()) json.telephone = input.phone.trim();
  return json;
}

export function buildWebSiteJsonLd(input: {
  name: string;
  url: string;
  /** When true, expose SearchAction for /products?q= */
  includeSearchAction: boolean;
}): JsonLd {
  const json: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: input.url,
  };
  if (input.includeSearchAction) {
    json.potentialAction = {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${input.url}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    };
  }
  return json;
}
