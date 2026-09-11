import "server-only";

import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import {
  CATALOG_CACHE_TAG,
  CATALOG_CATEGORIES_TAG,
  CATALOG_PRODUCTS_TAG,
  categoryCacheTag,
  productCacheTag,
} from "@/features/catalog/cache";
import {
  aggregateProductStockStatus,
  deriveStockStatus,
  type StockStatus,
} from "@/features/catalog/stock";
import { productListQuerySchema } from "@/features/catalog/validation";
import { formatMoney } from "@/features/catalog/money";
import type {
  StorefrontProductDetail,
  StorefrontProductImage,
} from "@/features/catalog/types";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import { isSafeModelStoragePath } from "@/features/visual-effects/schemas";

export { formatMoney };
export type { StorefrontProductDetail };

function getConfiguredStoreSlug(): string | null {
  const slug =
    process.env.STORE_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_STORE_SLUG?.trim() ||
    "";
  return slug || null;
}

async function resolveStoreId(): Promise<string | null> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;
  const slug = getConfiguredStoreSlug();
  let query = supabase.from("stores").select("id").eq("status", "active").limit(1);
  if (slug) {
    query = supabase
      .from("stores")
      .select("id")
      .eq("status", "active")
      .eq("slug", slug)
      .limit(1);
  }
  const { data } = await query;
  return data?.[0]?.id ?? null;
}

/** Active product counts keyed by category id (for storefront filter UI). */
export async function countStorefrontProductsByCategory(): Promise<
  Record<string, number>
> {
  const supabase = createSupabasePublicClient();
  const storeId = await resolveStoreId();
  if (!supabase || !storeId) return {};
  const { data } = await supabase
    .from("products")
    .select("category_id")
    .eq("store_id", storeId)
    .eq("status", "active");
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as { category_id: string | null }).category_id;
    if (!id) continue;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl?: string;
};

export type StorefrontProductCard = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  brand: string | null;
  featured: boolean;
  categoryName: string | null;
  categorySlug: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  stockStatus: StockStatus;
  primaryImageUrl?: string;
  primaryImageAlt?: string;
  secondaryImageUrl?: string;
  /** Up to 3 gallery URLs for card hover segments (primary first). */
  imageUrls?: string[];
  /** Lowest compare-at among active variants when higher than min price. */
  compareAtPrice?: number | null;
  /** Active variants; >1 requires choosing options before add-to-cart. */
  activeVariantCount: number;
  /** Set when exactly one active variant exists (safe quick-add). */
  defaultVariantId: string | null;
  /** Compact active variant options for card / quick-view (name + price only). */
  variantOptions: Array<{
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    available: boolean;
  }>;
};

type VariantJoin = {
  id: string;
  name: string;
  sku: string;
  price: number;
  compare_at_price: number | null;
  weight: number | null;
  unit: string | null;
  track_inventory: boolean;
  is_active: boolean;
  inventory:
    | { quantity: number; reserved_quantity: number; low_stock_threshold: number }
    | { quantity: number; reserved_quantity: number; low_stock_threshold: number }[]
    | null;
};

function inv(
  inventory: VariantJoin["inventory"],
): { quantity: number; reserved_quantity: number; low_stock_threshold: number } | null {
  if (!inventory) return null;
  return Array.isArray(inventory) ? inventory[0] ?? null : inventory;
}

async function listActiveCategoriesUncached(): Promise<StorefrontCategory[]> {
  const supabase = createSupabasePublicClient();
  const storeId = await resolveStoreId();
  if (!supabase || !storeId) return [];

  const { data } = await supabase
    .from("categories")
    .select(
      "id, name, slug, description, parent_id, image_path, seo_title, seo_description",
    )
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return ((data as Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parent_id: string | null;
    image_path: string | null;
    seo_title: string | null;
    seo_description: string | null;
  }> | null) ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parent_id: row.parent_id,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    imageUrl: resolvePublicStorageUrl("categories", row.image_path),
  }));
}

export const listStorefrontCategories = unstable_cache(
  listActiveCategoriesUncached,
  ["storefront-categories"],
  { revalidate: 60, tags: [CATALOG_CACHE_TAG, CATALOG_CATEGORIES_TAG] },
);

async function getCategoryBySlugUncached(
  slug: string,
): Promise<StorefrontCategory | null> {
  const supabase = createSupabasePublicClient();
  const storeId = await resolveStoreId();
  if (!supabase || !storeId) return null;

  const { data } = await supabase
    .from("categories")
    .select(
      "id, name, slug, description, parent_id, image_path, seo_title, seo_description",
    )
    .eq("store_id", storeId)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  const row = data as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parent_id: string | null;
    image_path: string | null;
    seo_title: string | null;
    seo_description: string | null;
  };
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parent_id: row.parent_id,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    imageUrl: resolvePublicStorageUrl("categories", row.image_path),
  };
}

export function getStorefrontCategoryBySlug(slug: string) {
  return unstable_cache(
    () => getCategoryBySlugUncached(slug),
    ["storefront-category", slug],
    {
      revalidate: 60,
      tags: [CATALOG_CACHE_TAG, CATALOG_CATEGORIES_TAG, categoryCacheTag(slug)],
    },
  )();
}

export async function listStorefrontProducts(rawQuery: unknown): Promise<{
  items: StorefrontProductCard[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const query = productListQuerySchema.parse({
    ...(typeof rawQuery === "object" && rawQuery ? rawQuery : {}),
    status: "active",
  });

  const cacheKey = [
    "storefront-products",
    String(query.page),
    String(query.pageSize),
    query.q || "",
    query.categoryId || "",
    query.featured || "",
    query.sort || "newest",
  ];

  return unstable_cache(
    () => listStorefrontProductsUncached(query),
    cacheKey,
    {
      revalidate: 60,
      tags: [CATALOG_CACHE_TAG, CATALOG_PRODUCTS_TAG],
    },
  )();
}

async function listStorefrontProductsUncached(
  query: ReturnType<typeof productListQuerySchema.parse>,
): Promise<{
  items: StorefrontProductCard[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const supabase = createSupabasePublicClient();
  const storeId = await resolveStoreId();
  if (!supabase || !storeId) {
    return { items: [], total: 0, page: query.page, pageSize: query.pageSize };
  }

  let dbQuery = supabase
    .from("products")
    .select(
      `
      id, name, slug, short_description, brand, featured, updated_at, created_at,
      categories ( name, slug ),
      product_variants (
        id, name, price, compare_at_price, is_active, track_inventory,
        inventory ( quantity, reserved_quantity, low_stock_threshold )
      ),
      product_images (
        id, storage_path, public_url, alt_text, is_primary, sort_order, variant_id
      )
    `,
      { count: "exact" },
    )
    .eq("store_id", storeId)
    .eq("status", "active");

  if (query.q) {
    const safe = query.q.replace(/[%_,]/g, " ").trim();
    if (safe) {
      dbQuery = dbQuery.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`);
    }
  }
  if (query.categoryId) dbQuery = dbQuery.eq("category_id", query.categoryId);
  if (query.featured === "true") dbQuery = dbQuery.eq("featured", true);

  if (query.sort === "oldest") {
    dbQuery = dbQuery.order("created_at", { ascending: true });
  } else if (query.sort === "name") {
    dbQuery = dbQuery.order("name", { ascending: true });
  } else if (query.sort === "name_desc") {
    dbQuery = dbQuery.order("name", { ascending: false });
  } else if (query.sort === "featured") {
    dbQuery = dbQuery
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });
  } else if (query.sort === "price" || query.sort === "price_desc") {
    dbQuery = dbQuery.order("created_at", { ascending: false });
  } else {
    dbQuery = dbQuery.order("created_at", { ascending: false });
  }

  const priceSort =
    query.sort === "price" || query.sort === "price_desc";
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  const { data, error, count } = priceSort
    ? await dbQuery
    : await dbQuery.range(from, to);
  if (error || !data) {
    return { items: [], total: 0, page: query.page, pageSize: query.pageSize };
  }

  let items: StorefrontProductCard[] = data.map((row) =>
    mapProductListRowToCard(row),
  );

  if (priceSort) {
    items.sort((a, b) => {
      const ap = a.minPrice ?? Number.POSITIVE_INFINITY;
      const bp = b.minPrice ?? Number.POSITIVE_INFINITY;
      return query.sort === "price" ? ap - bp : bp - ap;
    });
    items = items.slice(from, to + 1);
  }

  return {
    items,
    total: count ?? items.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}

type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  brand: string | null;
  featured: boolean;
  updated_at?: string;
  created_at?: string;
  categories:
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
  product_variants: unknown;
  product_images: unknown;
};

const PRODUCT_CARD_SELECT = `
  id, name, slug, short_description, brand, featured, updated_at, created_at,
  categories ( name, slug ),
  product_variants (
    id, name, price, compare_at_price, is_active, track_inventory,
    inventory ( quantity, reserved_quantity, low_stock_threshold )
  ),
  product_images (
    id, storage_path, public_url, alt_text, is_primary, sort_order, variant_id
  )
`;

function mapProductListRowToCard(row: ProductListRow): StorefrontProductCard {
  const category = Array.isArray(row.categories)
    ? row.categories[0]
    : row.categories;
  const variants = (row.product_variants as unknown as VariantJoin[] | null) ?? [];
  const images =
    (row.product_images as unknown as
      | Array<{
          id: string;
          storage_path: string;
          public_url: string | null;
          alt_text: string | null;
          is_primary: boolean;
          sort_order: number;
          variant_id: string | null;
        }>
      | null) ?? [];
  const primary =
    images.find((image) => image.is_primary) ??
    [...images].sort((a, b) => a.sort_order - b.sort_order)[0];
  const primaryUrl = primary
    ? primary.public_url ||
      resolvePublicStorageUrl("products", primary.storage_path)
    : undefined;
  const secondary =
    [...images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .find((image) => image.id !== primary?.id) ?? null;
  const secondaryUrl = secondary
    ? secondary.public_url ||
      resolvePublicStorageUrl("products", secondary.storage_path)
    : undefined;
  const imageUrls = [
    ...new Set(
      [...images]
        .sort((a, b) => {
          if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
          return a.sort_order - b.sort_order;
        })
        .map(
          (image) =>
            image.public_url ||
            resolvePublicStorageUrl("products", image.storage_path),
        )
        .filter((url): url is string => Boolean(url)),
    ),
  ].slice(0, 3);
  if (primaryUrl && !imageUrls.includes(primaryUrl)) {
    imageUrls.unshift(primaryUrl);
  }
  const galleryUrls = imageUrls.slice(0, 3);
  const activeVariants = variants.filter((v) => v.is_active);
  const activePrices = activeVariants.map((v) => Number(v.price));
  const compareAts = activeVariants
    .map((v) =>
      v.compare_at_price != null ? Number(v.compare_at_price) : null,
    )
    .filter((n): n is number => n != null && Number.isFinite(n));
  const minPrice = activePrices.length ? Math.min(...activePrices) : null;
  const compareAtPrice =
    minPrice != null && compareAts.length
      ? Math.min(...compareAts.filter((c) => c > minPrice))
      : null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    brand: row.brand,
    featured: row.featured,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    minPrice,
    maxPrice: activePrices.length ? Math.max(...activePrices) : null,
    stockStatus: aggregateProductStockStatus(
      variants.map((v) => ({
        is_active: v.is_active,
        track_inventory: v.track_inventory,
        inventory: inv(v.inventory),
      })),
    ),
    primaryImageUrl: primaryUrl ?? galleryUrls[0],
    primaryImageAlt: primary?.alt_text || row.name,
    secondaryImageUrl: secondaryUrl ?? galleryUrls[1],
    imageUrls: galleryUrls,
    compareAtPrice:
      compareAtPrice != null && Number.isFinite(compareAtPrice)
        ? compareAtPrice
        : null,
    activeVariantCount: activeVariants.length,
    defaultVariantId:
      activeVariants.length === 1 ? activeVariants[0]!.id : null,
    variantOptions: activeVariants.map((v) => {
      const inventory = inv(v.inventory);
      const status = deriveStockStatus({
        quantity: inventory?.quantity ?? 0,
        reservedQuantity: inventory?.reserved_quantity ?? 0,
        lowStockThreshold: inventory?.low_stock_threshold ?? 0,
        trackInventory: v.track_inventory,
      });
      return {
        id: v.id,
        name: v.name,
        price: Number(v.price),
        compareAtPrice:
          v.compare_at_price != null ? Number(v.compare_at_price) : null,
        available: status !== "OUT_OF_STOCK",
      };
    }),
  };
}

async function getProductBySlugUncached(
  slug: string,
): Promise<StorefrontProductDetail | null> {
  const supabase = createSupabasePublicClient();
  const storeId = await resolveStoreId();
  if (!supabase || !storeId) return null;

  const { data } = await supabase
    .from("products")
    .select(
      `
      id, name, slug, short_description, description, brand, ingredients,
      usage_instructions, featured, seo_title, seo_description, model_path,
      categories ( id, name, slug ),
      product_variants (
        id, name, sku, price, compare_at_price, weight, unit,
        track_inventory, is_active,
        inventory ( quantity, reserved_quantity, low_stock_threshold )
      ),
      product_images (
        id, storage_path, public_url, alt_text, is_primary, sort_order, variant_id
      )
    `,
    )
    .eq("store_id", storeId)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;

  const category = Array.isArray(data.categories)
    ? data.categories[0]
    : data.categories;
  const variants = ((data.product_variants as unknown as VariantJoin[] | null) ?? [])
    .filter((variant) => variant.is_active)
    .map((variant) => {
      const inventory = inv(variant.inventory);
      const available = inventory
        ? Math.max(0, inventory.quantity - inventory.reserved_quantity)
        : 0;
      return {
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        price: Number(variant.price),
        compareAtPrice:
          variant.compare_at_price == null
            ? null
            : Number(variant.compare_at_price),
        weight: variant.weight == null ? null : Number(variant.weight),
        unit: variant.unit,
        available,
        stockStatus: deriveStockStatus({
          quantity: inventory?.quantity ?? 0,
          reservedQuantity: inventory?.reserved_quantity ?? 0,
          lowStockThreshold: inventory?.low_stock_threshold ?? 0,
          trackInventory: variant.track_inventory,
        }),
      };
    });

  const images: StorefrontProductImage[] = (
    (data.product_images as unknown as
      | Array<{
          id: string;
          storage_path: string;
          public_url: string | null;
          alt_text: string | null;
          is_primary: boolean;
          sort_order: number;
          variant_id: string | null;
        }>
      | null) ?? []
  )
    .map((image) => {
      const url =
        image.public_url ||
        resolvePublicStorageUrl("products", image.storage_path);
      if (!url) return null;
      return {
        id: image.id,
        url,
        altText: image.alt_text || data.name,
        isPrimary: image.is_primary,
        variantId: image.variant_id,
        sortOrder: image.sort_order,
      };
    })
    .filter((image): image is StorefrontProductImage => Boolean(image))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    shortDescription: data.short_description,
    description: data.description,
    brand: data.brand,
    ingredients: data.ingredients,
    usageInstructions: data.usage_instructions,
    featured: data.featured,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    modelPath: (() => {
      const raw = (data as { model_path?: string | null }).model_path ?? null;
      return isSafeModelStoragePath(raw) ? raw!.trim() : null;
    })(),
    category: category
      ? { id: category.id, name: category.name, slug: category.slug }
      : null,
    images,
    variants,
  };
}

export function getStorefrontProductBySlug(slug: string) {
  return unstable_cache(
    () => getProductBySlugUncached(slug),
    ["storefront-product", slug],
    {
      revalidate: 60,
      tags: [CATALOG_CACHE_TAG, CATALOG_PRODUCTS_TAG, productCacheTag(slug)],
    },
  )();
}

/** Same-category products for the PDP “Related products” strip. */
export async function listSimilarStorefrontProducts(input: {
  productId: string;
  categoryId: string | null;
  limit?: number;
}): Promise<StorefrontProductCard[]> {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 5);

  const byCategory = input.categoryId
    ? await listStorefrontProducts({
        categoryId: input.categoryId,
        page: "1",
        pageSize: String(limit + 4),
        sort: "featured",
      })
    : { items: [] as StorefrontProductCard[] };

  let items = byCategory.items.filter((p) => p.id !== input.productId);

  if (items.length < Math.min(3, limit)) {
    const featured = await listStorefrontProducts({
      page: "1",
      pageSize: String(limit + 4),
      sort: "featured",
    });
    const seen = new Set(items.map((p) => p.id));
    seen.add(input.productId);
    for (const product of featured.items) {
      if (seen.has(product.id)) continue;
      items.push(product);
      seen.add(product.id);
      if (items.length >= limit) break;
    }
  }

  return items.slice(0, limit);
}

/** Featured / popular products for “Most viewed” style strip on PDP. */
export async function listPopularStorefrontProducts(input: {
  excludeProductId: string;
  limit?: number;
}): Promise<StorefrontProductCard[]> {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 5);
  const featured = await listStorefrontProducts({
    page: "1",
    pageSize: String(limit + 6),
    sort: "featured",
  });
  return featured.items
    .filter((p) => p.id !== input.excludeProductId)
    .slice(0, limit);
}

/** Resolve product cards by slug (recently viewed). Preserves slug order. */
export async function listStorefrontProductsBySlugs(
  slugs: string[],
): Promise<StorefrontProductCard[]> {
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))].slice(
    0,
    12,
  );
  if (!unique.length) return [];

  const supabase = createSupabasePublicClient();
  const storeId = await resolveStoreId();
  if (!supabase || !storeId) return [];

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT)
    .eq("store_id", storeId)
    .eq("status", "active")
    .in("slug", unique);

  if (error || !data) return [];

  const cards = (data as ProductListRow[]).map(mapProductListRowToCard);
  const bySlug = new Map(cards.map((c) => [c.slug, c]));
  return unique
    .map((slug) => bySlug.get(slug))
    .filter((c): c is StorefrontProductCard => Boolean(c));
}
