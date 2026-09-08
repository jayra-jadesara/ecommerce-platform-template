import "server-only";

import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  CATALOG_CACHE_TAG,
  CATALOG_PRODUCTS_TAG,
  productCacheTag,
} from "@/features/catalog/cache";
import {
  aggregateProductStockStatus,
  availableQuantity,
  type StockStatus,
} from "@/features/catalog/stock";
import {
  inventoryUpdateSchema,
  productFormSchema,
  productListQuerySchema,
  type ProductFormValues,
  type ProductListQuery,
  type VariantFormValues,
} from "@/features/catalog/validation";
import type { CatalogResult } from "@/features/catalog/categories-service";
import type { ProductStatus } from "@/types/database";

export type AdminProductListItem = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  featured: boolean;
  categoryId: string | null;
  categoryName: string | null;
  variantCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  stockStatus: StockStatus;
  updatedAt: string;
};

export type AdminProductDetail = {
  product: {
    id: string;
    name: string;
    slug: string;
    category_id: string | null;
    brand: string | null;
    short_description: string | null;
    description: string | null;
    ingredients: string | null;
    usage_instructions: string | null;
    status: ProductStatus;
    featured: boolean;
    seo_title: string | null;
    seo_description: string | null;
  };
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    compare_at_price: number | null;
    cost_price: number | null;
    weight: number | null;
    unit: string | null;
    track_inventory: boolean;
    is_active: boolean;
    inventory: {
      quantity: number;
      reserved_quantity: number;
      low_stock_threshold: number;
    } | null;
  }>;
};

type VariantJoin = {
  id: string;
  name: string;
  sku: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  weight: number | null;
  unit: string | null;
  track_inventory: boolean;
  is_active: boolean;
  inventory:
    | {
        quantity: number;
        reserved_quantity: number;
        low_stock_threshold: number;
      }
    | {
        quantity: number;
        reserved_quantity: number;
        low_stock_threshold: number;
      }[]
    | null;
};

function normalizeInventory(
  inventory: VariantJoin["inventory"],
): {
  quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
} | null {
  if (!inventory) return null;
  return Array.isArray(inventory) ? inventory[0] ?? null : inventory;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function revalidateProducts(productId?: string, slug?: string) {
  revalidateTag(CATALOG_CACHE_TAG, "max");
  revalidateTag(CATALOG_PRODUCTS_TAG, "max");
  if (productId) revalidateTag(productCacheTag(productId), "max");
  if (slug) revalidateTag(productCacheTag(slug), "max");
}

async function assertUniqueProductSlug(
  storeId: string,
  slug: string,
  excludeId?: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  if (data?.[0]) return "A product with this slug already exists.";
  return null;
}

async function assertUniqueSkus(
  variants: VariantFormValues[],
  excludeVariantIds: string[] = [],
): Promise<string | null> {
  const active = variants.filter((v) => !v._delete);
  const skus = active.map((v) => v.sku.trim().toUpperCase());
  if (new Set(skus).size !== skus.length) {
    return "Variant SKUs must be unique within the product.";
  }

  const supabase = await createSupabaseServerClient();
  for (const variant of active) {
    let query = supabase
      .from("product_variants")
      .select("id")
      .eq("sku", variant.sku.trim())
      .limit(1);
    if (variant.id) query = query.neq("id", variant.id);
    for (const excludeId of excludeVariantIds) {
      query = query.neq("id", excludeId);
    }
    const { data } = await query;
    if (data?.[0] && data[0].id !== variant.id) {
      return `SKU "${variant.sku}" is already in use.`;
    }
  }
  return null;
}

function mapListItem(
  row: {
    id: string;
    name: string;
    slug: string;
    status: ProductStatus;
    featured: boolean;
    category_id: string | null;
    updated_at: string;
    categories?: { name: string } | { name: string }[] | null;
    product_variants?: VariantJoin[] | null;
  },
): AdminProductListItem {
  const category = Array.isArray(row.categories)
    ? row.categories[0]
    : row.categories;
  const variants = row.product_variants ?? [];
  const prices = variants
    .filter((v) => v.is_active)
    .map((v) => Number(v.price))
    .filter((n) => Number.isFinite(n));

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    featured: row.featured,
    categoryId: row.category_id,
    categoryName: category?.name ?? null,
    variantCount: variants.length,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    stockStatus: aggregateProductStockStatus(
      variants.map((v) => ({
        is_active: v.is_active,
        track_inventory: v.track_inventory,
        inventory: normalizeInventory(v.inventory),
      })),
    ),
    updatedAt: row.updated_at,
  };
}

export async function listAdminProducts(
  rawQuery: unknown,
): Promise<{
  items: AdminProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  query: ProductListQuery;
}> {
  const parsed = productListQuerySchema.safeParse(rawQuery);
  const query = parsed.success
    ? parsed.data
    : productListQuerySchema.parse({});

  const empty = {
    items: [] as AdminProductListItem[],
    total: 0,
    page: query.page,
    pageSize: query.pageSize,
    query,
  };

  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "products.view")) return empty;

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return empty;

  let dbQuery = supabase
    .from("products")
    .select(
      `
      id, name, slug, status, featured, category_id, updated_at, created_at,
      categories ( name ),
      product_variants (
        id, name, sku, price, compare_at_price, cost_price, weight, unit,
        track_inventory, is_active,
        inventory ( quantity, reserved_quantity, low_stock_threshold )
      )
    `,
      { count: "exact" },
    )
    .eq("store_id", storeId);

  if (query.q) {
    const term = `%${query.q.replace(/[%_]/g, "")}%`;
    dbQuery = dbQuery.or(`name.ilike.${term},slug.ilike.${term}`);
  }
  if (query.categoryId) dbQuery = dbQuery.eq("category_id", query.categoryId);
  if (query.status !== "all") dbQuery = dbQuery.eq("status", query.status);
  if (query.featured === "true") dbQuery = dbQuery.eq("featured", true);
  if (query.featured === "false") dbQuery = dbQuery.eq("featured", false);

  const sort = query.sort;
  if (sort === "oldest") {
    dbQuery = dbQuery.order("created_at", { ascending: true });
  } else if (sort === "name") {
    dbQuery = dbQuery.order("name", { ascending: true });
  } else if (sort === "name_desc") {
    dbQuery = dbQuery.order("name", { ascending: false });
  } else if (sort === "featured") {
    dbQuery = dbQuery
      .order("featured", { ascending: false })
      .order("updated_at", { ascending: false });
  } else {
    dbQuery = dbQuery.order("created_at", { ascending: false });
  }

  const needsInMemory =
    query.stock !== "all" || sort === "price" || sort === "price_desc" || sort === "stock";

  if (!needsInMemory) {
    const from = (query.page - 1) * query.pageSize;
    const to = from + query.pageSize - 1;
    const { data, error, count } = await dbQuery.range(from, to);
    if (error || !data) return empty;
    return {
      items: data.map((row) => mapListItem(row as never)),
      total: count ?? data.length,
      page: query.page,
      pageSize: query.pageSize,
      query,
    };
  }

  const { data, error } = await dbQuery.limit(2000);
  if (error || !data) return empty;

  let items = data.map((row) => mapListItem(row as never));
  if (query.stock !== "all") {
    items = items.filter((item) => item.stockStatus === query.stock);
  }

  if (sort === "price" || sort === "price_desc") {
    items.sort((a, b) => {
      const left = a.minPrice ?? Number.POSITIVE_INFINITY;
      const right = b.minPrice ?? Number.POSITIVE_INFINITY;
      return sort === "price" ? left - right : right - left;
    });
  } else if (sort === "stock") {
    const rank: Record<StockStatus, number> = {
      OUT_OF_STOCK: 0,
      LOW_STOCK: 1,
      IN_STOCK: 2,
    };
    items.sort((a, b) => rank[a.stockStatus] - rank[b.stockStatus]);
  }

  const total = items.length;
  const from = (query.page - 1) * query.pageSize;
  const pageItems = items.slice(from, from + query.pageSize);

  return {
    items: pageItems,
    total,
    page: query.page,
    pageSize: query.pageSize,
    query,
  };
}

export async function getAdminProduct(
  id: string,
): Promise<AdminProductDetail | null> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "products.view")) return null;

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return null;

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, name, slug, category_id, brand, short_description, description,
      ingredients, usage_instructions, status, featured, seo_title, seo_description,
      product_variants (
        id, name, sku, price, compare_at_price, cost_price, weight, unit,
        track_inventory, is_active,
        inventory ( quantity, reserved_quantity, low_stock_threshold )
      )
    `,
    )
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error || !data) return null;

  const variants = ((data.product_variants as unknown as VariantJoin[] | null) ?? []).map(
    (variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      price: Number(variant.price),
      compare_at_price:
        variant.compare_at_price == null
          ? null
          : Number(variant.compare_at_price),
      cost_price:
        variant.cost_price == null ? null : Number(variant.cost_price),
      weight: variant.weight == null ? null : Number(variant.weight),
      unit: variant.unit,
      track_inventory: variant.track_inventory,
      is_active: variant.is_active,
      inventory: normalizeInventory(variant.inventory),
    }),
  );

  return {
    product: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      category_id: data.category_id,
      brand: data.brand,
      short_description: data.short_description,
      description: data.description,
      ingredients: data.ingredients,
      usage_instructions: data.usage_instructions,
      status: data.status as ProductStatus,
      featured: data.featured,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
    },
    variants,
  };
}

async function upsertVariantsForProduct(
  productId: string,
  variants: VariantFormValues[],
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const toDelete = variants.filter((v) => v._delete && v.id);
  const toPersist = variants.filter((v) => !v._delete);

  for (const variant of toDelete) {
    if (!variant.id) continue;
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", variant.id)
      .eq("product_id", productId);
    if (error) return "Unable to remove a variant.";
  }

  for (const variant of toPersist) {
    const payload = {
      product_id: productId,
      name: variant.name.trim(),
      sku: variant.sku.trim(),
      price: variant.price,
      compare_at_price: variant.compareAtPrice,
      cost_price: variant.costPrice,
      weight: variant.weight,
      unit: emptyToNull(variant.unit),
      track_inventory: variant.trackInventory,
      is_active: variant.isActive,
    };

    let variantId = variant.id ?? null;
    if (variantId) {
      const { error } = await supabase
        .from("product_variants")
        .update(payload)
        .eq("id", variantId)
        .eq("product_id", productId);
      if (error) return `Unable to update variant ${variant.name}.`;
    } else {
      const { data, error } = await supabase
        .from("product_variants")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) return `Unable to create variant ${variant.name}.`;
      variantId = data.id;
    }

    const { error: inventoryError } = await supabase.from("inventory").upsert({
      variant_id: variantId,
      quantity: variant.quantity,
      reserved_quantity: variant.reservedQuantity,
      low_stock_threshold: variant.lowStockThreshold,
    });
    if (inventoryError) return `Unable to update inventory for ${variant.name}.`;
  }

  return null;
}

export async function createProduct(input: unknown): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "products.create")) {
    return { ok: false, error: "You do not have permission to create products." };
  }

  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product." };
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return {
      ok: false,
      error:
        "Your store isn't ready yet. Open Store Settings and finish setup, then try saving again.",
    };
  }

  if (values.categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("id", values.categoryId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!category) return { ok: false, error: "Category not found for this store." };
  }

  const slugConflict = await assertUniqueProductSlug(storeId, values.slug);
  if (slugConflict) return { ok: false, error: slugConflict };

  const skuConflict = await assertUniqueSkus(values.variants);
  if (skuConflict) return { ok: false, error: skuConflict };

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      store_id: storeId,
      category_id: values.categoryId,
      name: values.name.trim(),
      slug: values.slug,
      short_description: emptyToNull(values.shortDescription),
      description: emptyToNull(values.description),
      brand: emptyToNull(values.brand),
      ingredients: emptyToNull(values.ingredients),
      usage_instructions: emptyToNull(values.usageInstructions),
      status: values.status,
      featured: values.featured,
      seo_title: emptyToNull(values.seoTitle),
      seo_description: emptyToNull(values.seoDescription),
    })
    .select("id, slug")
    .single();

  if (error || !product) {
    return { ok: false, error: "Unable to create product. Check permissions and try again." };
  }

  const variantError = await upsertVariantsForProduct(product.id, values.variants);
  if (variantError) {
    await supabase.from("products").delete().eq("id", product.id);
    return { ok: false, error: variantError };
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "PRODUCT_CREATED",
    entity_type: "products",
    entity_id: product.id,
    metadata: { slug: product.slug, status: values.status },
  });

  revalidateProducts(product.id, product.slug);
  return { ok: true, message: "Product created.", id: product.id };
}

export async function updateProduct(
  id: string,
  input: unknown,
): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "products.update")) {
    return { ok: false, error: "You do not have permission to update products." };
  }

  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product." };
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return {
      ok: false,
      error:
        "Your store isn't ready yet. Open Store Settings and finish setup, then try saving again.",
    };
  }

  const { data: existing } = await supabase
    .from("products")
    .select("id, slug")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Product not found." };

  if (values.categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("id", values.categoryId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!category) return { ok: false, error: "Category not found for this store." };
  }

  const slugConflict = await assertUniqueProductSlug(storeId, values.slug, id);
  if (slugConflict) return { ok: false, error: slugConflict };

  const skuConflict = await assertUniqueSkus(values.variants);
  if (skuConflict) return { ok: false, error: skuConflict };

  const { error } = await supabase
    .from("products")
    .update({
      category_id: values.categoryId,
      name: values.name.trim(),
      slug: values.slug,
      short_description: emptyToNull(values.shortDescription),
      description: emptyToNull(values.description),
      brand: emptyToNull(values.brand),
      ingredients: emptyToNull(values.ingredients),
      usage_instructions: emptyToNull(values.usageInstructions),
      status: values.status,
      featured: values.featured,
      seo_title: emptyToNull(values.seoTitle),
      seo_description: emptyToNull(values.seoDescription),
    })
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    return { ok: false, error: "Unable to update product. Check permissions and try again." };
  }

  const variantError = await upsertVariantsForProduct(id, values.variants);
  if (variantError) return { ok: false, error: variantError };

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "PRODUCT_UPDATED",
    entity_type: "products",
    entity_id: id,
    metadata: { slug: values.slug, status: values.status, featured: values.featured },
  });

  revalidateProducts(id, values.slug);
  if (existing.slug !== values.slug) revalidateProducts(undefined, existing.slug);
  return { ok: true, message: "Product updated.", id };
}

export async function archiveProduct(id: string): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "products.update")) {
    return { ok: false, error: "You do not have permission to archive products." };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return {
      ok: false,
      error:
        "Your store isn't ready yet. Open Store Settings and finish setup, then try saving again.",
    };
  }

  const { data, error } = await supabase
    .from("products")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("slug")
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Unable to archive product." };

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "PRODUCT_ARCHIVED",
    entity_type: "products",
    entity_id: id,
    metadata: {},
  });

  revalidateProducts(id, data.slug);
  return { ok: true, message: "Product archived.", id };
}

export async function deleteProduct(id: string): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "products.delete")) {
    return { ok: false, error: "You do not have permission to delete products." };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return {
      ok: false,
      error:
        "Your store isn't ready yet. Open Store Settings and finish setup, then try saving again.",
    };
  }

  const { data: existing } = await supabase
    .from("products")
    .select("slug")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Product not found." };

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) return { ok: false, error: "Unable to delete product." };

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "PRODUCT_DELETED",
    entity_type: "products",
    entity_id: id,
    metadata: { slug: existing.slug },
  });

  revalidateProducts(id, existing.slug);
  return { ok: true, message: "Product deleted." };
}

export async function updateInventory(
  input: unknown,
): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "inventory.update")) {
    return { ok: false, error: "You do not have permission to update inventory." };
  }

  const parsed = inventoryUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid inventory." };
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return {
      ok: false,
      error:
        "Your store isn't ready yet. Open Store Settings and finish setup, then try saving again.",
    };
  }

  const { data: variant } = await supabase
    .from("product_variants")
    .select("id, product_id, products!inner(store_id, slug)")
    .eq("id", values.variantId)
    .maybeSingle();

  const product = variant?.products as
    | { store_id: string; slug: string }
    | { store_id: string; slug: string }[]
    | null
    | undefined;
  const productRow = Array.isArray(product) ? product[0] : product;
  if (!variant || !productRow || productRow.store_id !== storeId) {
    return { ok: false, error: "Variant not found for this store." };
  }

  const { error } = await supabase.from("inventory").upsert({
    variant_id: values.variantId,
    quantity: values.quantity,
    reserved_quantity: values.reservedQuantity,
    low_stock_threshold: values.lowStockThreshold,
  });

  if (error) {
    return { ok: false, error: "Unable to update inventory. Check values and try again." };
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "INVENTORY_UPDATED",
    entity_type: "inventory",
    entity_id: values.variantId,
    metadata: {
      quantity: values.quantity,
      reserved_quantity: values.reservedQuantity,
      available: availableQuantity(values.quantity, values.reservedQuantity),
    },
  });

  revalidateProducts(variant.product_id, productRow.slug);
  return { ok: true, message: "Inventory updated." };
}

export function toProductFormValues(
  detail: AdminProductDetail,
): ProductFormValues {
  return {
    name: detail.product.name,
    slug: detail.product.slug,
    categoryId: detail.product.category_id,
    brand: detail.product.brand ?? "",
    shortDescription: detail.product.short_description ?? "",
    description: detail.product.description ?? "",
    ingredients: detail.product.ingredients ?? "",
    usageInstructions: detail.product.usage_instructions ?? "",
    status: detail.product.status,
    featured: detail.product.featured,
    seoTitle: detail.product.seo_title ?? "",
    seoDescription: detail.product.seo_description ?? "",
    variants: detail.variants.map((variant) => ({
      id: variant.id,
      clientKey: variant.id,
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      compareAtPrice: variant.compare_at_price,
      costPrice: variant.cost_price,
      weight: variant.weight,
      unit: variant.unit ?? "",
      trackInventory: variant.track_inventory,
      isActive: variant.is_active,
      quantity: variant.inventory?.quantity ?? 0,
      reservedQuantity: variant.inventory?.reserved_quantity ?? 0,
      lowStockThreshold: variant.inventory?.low_stock_threshold ?? 5,
      _delete: false,
    })),
  };
}
