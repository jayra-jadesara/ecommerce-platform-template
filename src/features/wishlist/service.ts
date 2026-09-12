import "server-only";

import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import {
  availableQuantity,
  deriveStockStatus,
  type StockStatus,
} from "@/features/catalog/stock";
import {
  emptyWishlistView,
  type WishlistLineView,
  type WishlistMutationResult,
  type WishlistView,
} from "@/features/wishlist/types";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient<Database>;

type WishlistRow = Database["public"]["Tables"]["wishlists"]["Row"];

type ItemJoin = {
  id: string;
  product_id: string;
  variant_id: string | null;
  products: {
    id: string;
    name: string;
    slug: string;
    status: string;
    store_id: string;
    product_images:
      | Array<{
          storage_path: string;
          public_url: string | null;
          alt_text: string | null;
          is_primary: boolean;
          sort_order: number;
          variant_id: string | null;
        }>
      | null;
  } | null;
  product_variants: {
    id: string;
    name: string;
    price: number;
    is_active: boolean;
    track_inventory: boolean;
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
  } | null;
};

async function loadCurrency(client: Db, storeId: string): Promise<string> {
  const { data } = await client
    .from("store_settings")
    .select("currency")
    .eq("store_id", storeId)
    .maybeSingle();
  return data?.currency || "INR";
}

async function getOrCreateWishlist(
  client: Db,
  storeId: string,
  userId: string,
): Promise<WishlistRow | null> {
  const { data: existing } = await client
    .from("wishlists")
    .select("*")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await client
    .from("wishlists")
    .insert({ store_id: storeId, user_id: userId })
    .select("*")
    .single();
  if (error) return null;
  return data;
}

function mapLine(row: ItemJoin, storeId: string): WishlistLineView {
  const product = row.products;
  const variant = row.product_variants;

  let stockStatus: StockStatus | "UNAVAILABLE" = "UNAVAILABLE";
  let canAddToCart = false;
  let unitPrice: number | null = null;

  if (
    product &&
    product.store_id === storeId &&
    product.status === "active" &&
    variant &&
    variant.is_active
  ) {
    unitPrice = Number(variant.price);
    const invRaw = variant.inventory;
    const inv = Array.isArray(invRaw) ? invRaw[0] ?? null : invRaw;
    stockStatus = deriveStockStatus({
      quantity: inv?.quantity ?? 0,
      reservedQuantity: inv?.reserved_quantity ?? 0,
      lowStockThreshold: inv?.low_stock_threshold ?? 5,
      trackInventory: variant.track_inventory,
    });
    const available = variant.track_inventory
      ? availableQuantity(inv?.quantity ?? 0, inv?.reserved_quantity ?? 0)
      : 1;
    canAddToCart = available > 0;
  }

  const images = product?.product_images ?? [];
  const preferred =
    (row.variant_id
      ? images.find((image) => image.variant_id === row.variant_id)
      : undefined) ??
    images.find((image) => image.is_primary) ??
    [...images].sort((a, b) => a.sort_order - b.sort_order)[0];

  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    productName: product?.name ?? "Unavailable product",
    productSlug: product?.slug ?? "",
    variantName: variant?.name ?? null,
    unitPrice,
    imageUrl: preferred
      ? preferred.public_url ||
        resolvePublicStorageUrl("products", preferred.storage_path) ||
        null
      : null,
    imageAlt: preferred?.alt_text || product?.name || "Product",
    stockStatus,
    canAddToCart,
  };
}

async function fetchItems(client: Db, wishlistId: string): Promise<ItemJoin[]> {
  const { data, error } = await client
    .from("wishlist_items")
    .select(
      `
      id, product_id, variant_id,
      products (
        id, name, slug, status, store_id,
        product_images (
          storage_path, public_url, alt_text, is_primary, sort_order, variant_id
        )
      ),
      product_variants (
        id, name, price, is_active, track_inventory,
        inventory ( quantity, reserved_quantity, low_stock_threshold )
      )
    `,
    )
    .eq("wishlist_id", wishlistId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as ItemJoin[];
}

function toView(
  wishlist: WishlistRow,
  items: ItemJoin[],
  currency: string,
): WishlistView {
  return {
    id: wishlist.id,
    storeId: wishlist.store_id,
    items: items.map((item) => mapLine(item, wishlist.store_id)),
    currency,
  };
}

export async function getWishlist(): Promise<WishlistView> {
  const user = await getCurrentUser();
  const storeId = await resolveActiveStoreId();
  if (!user || !storeId) return emptyWishlistView();

  const client = await createSupabaseServerClient();
  const currency = await loadCurrency(client, storeId);
  const wishlist = await getOrCreateWishlist(client, storeId, user.id);
  if (!wishlist) return { ...emptyWishlistView(currency), storeId };

  const items = await fetchItems(client, wishlist.id);
  return toView(wishlist, items, currency);
}

export async function addToWishlist(input: {
  productId: string;
  variantId?: string | null;
}): Promise<WishlistMutationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to save items to your wishlist." };
  }

  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store is not configured." };

  const client = await createSupabaseServerClient();
  const currency = await loadCurrency(client, storeId);

  const { data: product } = await client
    .from("products")
    .select("id, store_id, status")
    .eq("id", input.productId)
    .maybeSingle();

  if (!product || product.store_id !== storeId) {
    return { ok: false, error: "This product is not available in this store." };
  }
  if (product.status !== "active") {
    return { ok: false, error: "This product is currently unavailable." };
  }

  const variantId = input.variantId ?? null;
  if (variantId) {
    const { data: variant } = await client
      .from("product_variants")
      .select("id, product_id, is_active")
      .eq("id", variantId)
      .maybeSingle();
    if (!variant || variant.product_id !== product.id) {
      return { ok: false, error: "Selected option is invalid." };
    }
  }

  const wishlist = await getOrCreateWishlist(client, storeId, user.id);
  if (!wishlist) {
    return unexpectedFailure({
      type: "CART",
      source: "DATABASE",
      operation: "WISHLIST_ADD",
      feature: "CART",
      message: "Unable to open wishlist",
      storeId,
      entityType: "wishlist",
      entityId: user.id,
      route: "/account/wishlist",
    });
  }

  if (variantId) {
    const { data: existing } = await client
      .from("wishlist_items")
      .select("id")
      .eq("wishlist_id", wishlist.id)
      .eq("variant_id", variantId)
      .maybeSingle();
    if (existing) {
      const items = await fetchItems(client, wishlist.id);
      return {
        ok: true,
        wishlist: toView(wishlist, items, currency),
        message: "Already in wishlist.",
        inWishlist: true,
      };
    }
  } else {
    const { data: existing } = await client
      .from("wishlist_items")
      .select("id")
      .eq("wishlist_id", wishlist.id)
      .eq("product_id", input.productId)
      .is("variant_id", null)
      .maybeSingle();
    if (existing) {
      const items = await fetchItems(client, wishlist.id);
      return {
        ok: true,
        wishlist: toView(wishlist, items, currency),
        message: "Already in wishlist.",
        inWishlist: true,
      };
    }
  }

  const { error } = await client.from("wishlist_items").insert({
    wishlist_id: wishlist.id,
    product_id: input.productId,
    variant_id: variantId,
  });

  if (error) {
    if (error.code === "23505") {
      const items = await fetchItems(client, wishlist.id);
      return {
        ok: true,
        wishlist: toView(wishlist, items, currency),
        message: "Already in wishlist.",
        inWishlist: true,
      };
    }
    return unexpectedFailure({
      type: "CART",
      source: "DATABASE",
      operation: "WISHLIST_ADD",
      feature: "CART",
      message: error.message || "Unable to add to wishlist",
      error,
      storeId,
      entityType: "wishlist_item",
      entityId: wishlist.id,
      route: "/account/wishlist",
    });
  }

  const items = await fetchItems(client, wishlist.id);
  return {
    ok: true,
    wishlist: toView(wishlist, items, currency),
    message: "Saved to wishlist.",
    inWishlist: true,
  };
}

export async function removeFromWishlist(
  wishlistItemId: string,
): Promise<WishlistMutationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to manage your wishlist." };
  }

  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store is not configured." };

  const client = await createSupabaseServerClient();
  const currency = await loadCurrency(client, storeId);
  const wishlist = await getOrCreateWishlist(client, storeId, user.id);
  if (!wishlist) {
    return unexpectedFailure({
      type: "CART",
      source: "DATABASE",
      operation: "WISHLIST_REMOVE",
      feature: "CART",
      message: "Unable to open wishlist",
      storeId,
      entityType: "wishlist",
      entityId: user.id,
      route: "/account/wishlist",
    });
  }

  const { error } = await client
    .from("wishlist_items")
    .delete()
    .eq("id", wishlistItemId)
    .eq("wishlist_id", wishlist.id);

  if (error) {
    return unexpectedFailure({
      type: "CART",
      source: "DATABASE",
      operation: "WISHLIST_REMOVE",
      feature: "CART",
      message: error.message || "Unable to remove from wishlist",
      error,
      storeId,
      entityType: "wishlist_item",
      entityId: wishlistItemId,
      route: "/account/wishlist",
    });
  }

  const items = await fetchItems(client, wishlist.id);
  return {
    ok: true,
    wishlist: toView(wishlist, items, currency),
    message: "Removed from wishlist.",
  };
}

export async function isInWishlist(input: {
  productId: string;
  variantId?: string | null;
}): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const storeId = await resolveActiveStoreId();
  if (!storeId) return false;

  const client = await createSupabaseServerClient();
  const { data: wishlist } = await client
    .from("wishlists")
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!wishlist) return false;

  let query = client
    .from("wishlist_items")
    .select("id")
    .eq("wishlist_id", wishlist.id)
    .eq("product_id", input.productId)
    .limit(1);

  if (input.variantId) {
    query = query.eq("variant_id", input.variantId);
  } else {
    query = query.is("variant_id", null);
  }

  const { data } = await query.maybeSingle();
  return Boolean(data);
}

/**
 * Batch membership check for product grids — one wishlist + one items query.
 * Returns keys `${productId}:${variantId ?? ""}` that are on the wishlist.
 */
export async function getWishlistMembershipKeys(
  items: { productId: string; variantId?: string | null }[],
): Promise<string[]> {
  if (items.length === 0) return [];

  const user = await getCurrentUser();
  if (!user) return [];
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];

  const client = await createSupabaseServerClient();
  const { data: wishlist } = await client
    .from("wishlists")
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!wishlist) return [];

  const productIds = [...new Set(items.map((item) => item.productId))];
  const { data: rows } = await client
    .from("wishlist_items")
    .select("product_id, variant_id")
    .eq("wishlist_id", wishlist.id)
    .in("product_id", productIds);

  if (!rows?.length) return [];

  const wanted = new Set(
    items.map(
      (item) => `${item.productId}:${item.variantId ?? ""}`,
    ),
  );

  const found: string[] = [];
  for (const row of rows) {
    const key = `${row.product_id}:${row.variant_id ?? ""}`;
    if (wanted.has(key)) found.push(key);
  }
  return found;
}

/**
 * All membership keys for the current user's wishlist (for shared card cache).
 */
export async function getAllWishlistMembershipKeys(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];

  const client = await createSupabaseServerClient();
  const { data: wishlist } = await client
    .from("wishlists")
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!wishlist) return [];

  const { data: rows } = await client
    .from("wishlist_items")
    .select("product_id, variant_id")
    .eq("wishlist_id", wishlist.id);

  if (!rows?.length) return [];
  return rows.map(
    (row) => `${row.product_id}:${row.variant_id ?? ""}`,
  );
}

export async function toggleWishlist(input: {
  productId: string;
  variantId?: string | null;
}): Promise<WishlistMutationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to save items to your wishlist." };
  }

  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store is not configured." };

  const client = await createSupabaseServerClient();
  const wishlist = await getOrCreateWishlist(client, storeId, user.id);
  if (!wishlist) {
    return unexpectedFailure({
      type: "CART",
      source: "DATABASE",
      operation: "WISHLIST_ADD",
      feature: "CART",
      message: "Unable to open wishlist",
      storeId,
      entityType: "wishlist",
      entityId: user.id,
      route: "/account/wishlist",
    });
  }

  let find = client
    .from("wishlist_items")
    .select("id")
    .eq("wishlist_id", wishlist.id)
    .eq("product_id", input.productId)
    .limit(1);

  if (input.variantId) {
    find = find.eq("variant_id", input.variantId);
  } else {
    find = find.is("variant_id", null);
  }

  const { data: existing } = await find.maybeSingle();
  if (existing) {
    return removeFromWishlist(existing.id);
  }

  return addToWishlist(input);
}
