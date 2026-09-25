/**
 * Storefront sync topics — data domains, NOT admin menu names.
 * Register new Admin→Store dependencies here when features are added.
 */

import {
  CATALOG_CACHE_TAG,
  CATALOG_CATEGORIES_TAG,
  CATALOG_PRODUCTS_TAG,
} from "@/features/catalog/cache";
import {
  STOREFRONT_BANNERS_CACHE_TAG,
  STOREFRONT_HOMEPAGE_CACHE_TAG,
  STOREFRONT_PAGES_CACHE_TAG,
  STOREFRONT_REELS_CACHE_TAG,
} from "@/features/cms/cache";
import { STOREFRONT_BLOG_CACHE_TAG } from "@/features/blog/cache";

/** Mirrored from theme/service — kept local so topics stay client-safe. */
const STOREFRONT_CONFIG_CACHE_TAG = "storefront-config";
/** Mirrored from pricing/config — kept local so topics stay client-safe. */
const PRICING_SETTINGS_CACHE_TAG = "pricing-settings";

/** Cache tags for domains that previously used path-only invalidation. */
export const STOREFRONT_BROCHURE_CACHE_TAG = "storefront-brochure";
export const STOREFRONT_COUPONS_CACHE_TAG = "storefront-coupons";

/** Extensible topic ids derived from storefront data domains. */
export const SYNC_TOPICS = [
  "store.config",
  "store.branding",
  "store.theme",
  "store.navigation",
  "store.header",
  "store.footer",
  "store.seo",
  "commerce.pricing",
  "commerce.coupons",
  "catalog.products",
  "catalog.categories",
  "catalog.product_page",
  "catalog.reviews",
  "cms.homepage",
  "cms.pages",
  "cms.banners",
  "cms.reels",
  "cms.brochure",
  "content.blog",
  "content.career",
  "media.assets",
] as const;

export type SyncTopic = (typeof SYNC_TOPICS)[number];

export type SyncTopicDefinition = {
  tags: string[];
  paths?: string[];
  queryKeyPrefixes?: readonly (readonly string[])[];
  refreshRouter?: boolean;
};

/**
 * Topic → invalidation contract.
 * When adding a Store-facing Admin feature, append a topic and map it here.
 */
export const SYNC_TOPIC_REGISTRY: Record<SyncTopic, SyncTopicDefinition> = {
  "store.config": {
    tags: [STOREFRONT_CONFIG_CACHE_TAG],
    paths: ["/"],
    refreshRouter: true,
  },
  "store.branding": {
    tags: [STOREFRONT_CONFIG_CACHE_TAG],
    paths: ["/"],
    refreshRouter: true,
  },
  "store.theme": {
    tags: [STOREFRONT_CONFIG_CACHE_TAG],
    paths: ["/"],
    refreshRouter: true,
  },
  "store.navigation": {
    tags: [STOREFRONT_CONFIG_CACHE_TAG],
    paths: ["/"],
    refreshRouter: true,
  },
  "store.header": {
    tags: [STOREFRONT_CONFIG_CACHE_TAG],
    paths: ["/"],
    refreshRouter: true,
  },
  "store.footer": {
    tags: [STOREFRONT_CONFIG_CACHE_TAG],
    paths: ["/"],
    refreshRouter: true,
  },
  "store.seo": {
    tags: [STOREFRONT_CONFIG_CACHE_TAG],
    paths: ["/"],
    refreshRouter: true,
  },
  "commerce.pricing": {
    tags: [PRICING_SETTINGS_CACHE_TAG, CATALOG_CACHE_TAG],
    paths: ["/cart", "/checkout", "/products"],
    queryKeyPrefixes: [["free-shipping-hint"], ["cart"], ["cart-count"]],
    refreshRouter: true,
  },
  "commerce.coupons": {
    tags: [STOREFRONT_COUPONS_CACHE_TAG],
    paths: ["/"],
    refreshRouter: true,
  },
  "catalog.products": {
    tags: [CATALOG_CACHE_TAG, CATALOG_PRODUCTS_TAG],
    paths: ["/products"],
    queryKeyPrefixes: [["quick-view"]],
    refreshRouter: true,
  },
  "catalog.categories": {
    tags: [CATALOG_CACHE_TAG, CATALOG_CATEGORIES_TAG],
    paths: ["/products", "/"],
    refreshRouter: true,
  },
  "catalog.product_page": {
    tags: [STOREFRONT_CONFIG_CACHE_TAG, CATALOG_CACHE_TAG],
    paths: ["/products"],
    refreshRouter: true,
  },
  "catalog.reviews": {
    tags: [CATALOG_CACHE_TAG, CATALOG_PRODUCTS_TAG],
    paths: ["/products"],
    refreshRouter: true,
  },
  "cms.homepage": {
    tags: [STOREFRONT_HOMEPAGE_CACHE_TAG, STOREFRONT_PAGES_CACHE_TAG],
    paths: ["/"],
    refreshRouter: true,
  },
  "cms.pages": {
    tags: [STOREFRONT_PAGES_CACHE_TAG],
    paths: ["/about", "/career", "/privacy", "/terms", "/disclaimer", "/contact"],
    refreshRouter: true,
  },
  "cms.banners": {
    tags: [STOREFRONT_BANNERS_CACHE_TAG, STOREFRONT_HOMEPAGE_CACHE_TAG],
    paths: ["/"],
    refreshRouter: true,
  },
  "cms.reels": {
    tags: [STOREFRONT_REELS_CACHE_TAG, STOREFRONT_HOMEPAGE_CACHE_TAG],
    paths: ["/", "/products"],
    refreshRouter: true,
  },
  "cms.brochure": {
    tags: [STOREFRONT_BROCHURE_CACHE_TAG],
    paths: ["/brochure"],
    refreshRouter: true,
  },
  "content.blog": {
    tags: [STOREFRONT_BLOG_CACHE_TAG],
    paths: ["/blog"],
    refreshRouter: true,
  },
  "content.career": {
    tags: [STOREFRONT_PAGES_CACHE_TAG],
    paths: ["/career"],
    refreshRouter: true,
  },
  "media.assets": {
    tags: [
      STOREFRONT_CONFIG_CACHE_TAG,
      CATALOG_CACHE_TAG,
      STOREFRONT_HOMEPAGE_CACHE_TAG,
    ],
    paths: ["/"],
    refreshRouter: true,
  },
};

export function isSyncTopic(value: string): value is SyncTopic {
  return (SYNC_TOPICS as readonly string[]).includes(value);
}

export function resolveSyncPlan(topics: readonly SyncTopic[]): {
  tags: string[];
  paths: string[];
  queryKeyPrefixes: string[][];
  refreshRouter: boolean;
} {
  const tags = new Set<string>();
  const paths = new Set<string>();
  const queryKeyPrefixes: string[][] = [];
  let refreshRouter = false;

  for (const topic of topics) {
    const def = SYNC_TOPIC_REGISTRY[topic];
    if (!def) continue;
    for (const tag of def.tags) tags.add(tag);
    for (const path of def.paths ?? []) paths.add(path);
    for (const prefix of def.queryKeyPrefixes ?? []) {
      queryKeyPrefixes.push([...prefix]);
    }
    if (def.refreshRouter !== false) refreshRouter = true;
  }

  return {
    tags: [...tags],
    paths: [...paths],
    queryKeyPrefixes,
    refreshRouter,
  };
}
