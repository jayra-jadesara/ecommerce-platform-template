import "server-only";

import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import {
  CATALOG_CACHE_TAG,
  CATALOG_CATEGORIES_TAG,
  CATALOG_PRODUCTS_TAG,
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

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
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
  /** Active variants; >1 requires choosing options before add-to-cart. */
  activeVariantCount: number;
  /** Set when exactly one active variant exists (safe quick-add). */
  defaultVariantId: string | null;
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
    .select("id, name, slug, description, parent_id")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (data as StorefrontCategory[] | null) ?? [];
}

export const listStorefrontCategories = unstable_cache(
  listActiveCategoriesUncached,
  ["storefront-categories"],
  { revalidate: 60, tags: [CATALOG_CACHE_TAG, CATALOG_CATEGORIES_TAG] },
);

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
        id, price, is_active, track_inventory,
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
  } else if (query.sort === "featured") {
    dbQuery = dbQuery
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    dbQuery = dbQuery.order("created_at", { ascending: false });
  }

  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  const { data, error, count } = await dbQuery.range(from, to);
  if (error || !data) {
    return { items: [], total: 0, page: query.page, pageSize: query.pageSize };
  }

  const items: StorefrontProductCard[] = data.map((row) => {
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
    const activeVariants = variants.filter((v) => v.is_active);
    const activePrices = activeVariants.map((v) => Number(v.price));

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      shortDescription: row.short_description,
      brand: row.brand,
      featured: row.featured,
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
      minPrice: activePrices.length ? Math.min(...activePrices) : null,
      maxPrice: activePrices.length ? Math.max(...activePrices) : null,
      stockStatus: aggregateProductStockStatus(
        variants.map((v) => ({
          is_active: v.is_active,
          track_inventory: v.track_inventory,
          inventory: inv(v.inventory),
        })),
      ),
      primaryImageUrl: primaryUrl,
      primaryImageAlt: primary?.alt_text || row.name,
      activeVariantCount: activeVariants.length,
      defaultVariantId:
        activeVariants.length === 1 ? activeVariants[0]!.id : null,
    };
  });

  return {
    items,
    total: count ?? items.length,
    page: query.page,
    pageSize: query.pageSize,
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
