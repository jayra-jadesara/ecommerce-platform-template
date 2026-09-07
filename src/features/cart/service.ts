import "server-only";

import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import { availableQuantity } from "@/features/catalog/stock";
import {
  clearGuestCartCookie,
  ensureGuestCartToken,
  guestCartTtlDays,
  readGuestCartToken,
} from "@/features/cart/cookie";
import {
  cartItemCount,
  emptyCartView,
  guestCartExpiryDate,
  mergeQuantities,
  type CartLineAvailability,
  type CartLineView,
  type CartMutationResult,
  type CartView,
} from "@/features/cart/types";
import { validatePurchasableVariant } from "@/features/cart/variant-validation";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import { calculateSubtotalMinor } from "@/features/pricing/engine";
import { majorToMinor, minorToMajor } from "@/features/pricing/money";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient<Database>;

type CartRow = Database["public"]["Tables"]["carts"]["Row"];

type ItemJoin = {
  id: string;
  quantity: number;
  product_id: string;
  variant_id: string;
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
      | { quantity: number; reserved_quantity: number }
      | { quantity: number; reserved_quantity: number }[]
      | null;
  } | null;
};

function friendlyDbError(): string {
  return "Something went wrong while updating your cart. Please try again.";
}

function serviceClientOrNull(): Db | null {
  try {
    return createSupabaseServiceClient();
  } catch {
    return null;
  }
}

async function requireStoreId(): Promise<string | null> {
  return resolveActiveStoreId();
}

async function loadCurrency(storeId: string, client: Db): Promise<string> {
  const { data } = await client
    .from("store_settings")
    .select("currency")
    .eq("store_id", storeId)
    .maybeSingle();
  return data?.currency || "INR";
}

function mapLine(
  row: ItemJoin,
  storeId: string,
): CartLineView {
  const product = row.products;
  const variant = row.product_variants;
  const unitPrice = variant ? Number(variant.price) : 0;

  let availability: CartLineAvailability = "AVAILABLE";
  let availableStock: number | null = null;

  if (!product || product.store_id !== storeId || !variant) {
    availability = "MISSING";
  } else if (product.status !== "active" || !variant.is_active) {
    availability = "INACTIVE";
  } else if (variant.track_inventory) {
    const invRaw = variant.inventory;
    const inv = Array.isArray(invRaw) ? invRaw[0] ?? null : invRaw;
    if (!inv) {
      availability = "OUT_OF_STOCK";
      availableStock = 0;
    } else {
      availableStock = availableQuantity(inv.quantity, inv.reserved_quantity);
      if (availableStock <= 0) availability = "OUT_OF_STOCK";
      else if (row.quantity > availableStock) availability = "OUT_OF_STOCK";
    }
  }

  const images = product?.product_images ?? [];
  const preferred =
    images.find((image) => image.variant_id === row.variant_id) ??
    images.find((image) => image.is_primary) ??
    [...images].sort((a, b) => a.sort_order - b.sort_order)[0];

  const imageUrl = preferred
    ? preferred.public_url ||
      resolvePublicStorageUrl("products", preferred.storage_path) ||
      null
    : null;

  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    productName: product?.name ?? "Unavailable product",
    productSlug: product?.slug ?? "",
    variantName: variant?.name ?? "Unavailable option",
    quantity: row.quantity,
    unitPrice,
    lineTotal: unitPrice * row.quantity,
    imageUrl,
    imageAlt: preferred?.alt_text || product?.name || "Product",
    availability,
    availableStock,
  };
}

async function fetchCartItems(client: Db, cartId: string): Promise<ItemJoin[]> {
  const { data, error } = await client
    .from("cart_items")
    .select(
      `
      id, quantity, product_id, variant_id,
      products (
        id, name, slug, status, store_id,
        product_images (
          storage_path, public_url, alt_text, is_primary, sort_order, variant_id
        )
      ),
      product_variants (
        id, name, price, is_active, track_inventory,
        inventory ( quantity, reserved_quantity )
      )
    `,
    )
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as unknown as ItemJoin[];
}

function toCartView(
  cart: CartRow,
  items: ItemJoin[],
  currency: string,
): CartView {
  const lines = items.map((item) => mapLine(item, cart.store_id));
  const subtotalMinor = lines.length
    ? calculateSubtotalMinor(
        lines.map((line) => ({
          unitPriceMinor: majorToMinor(line.unitPrice, currency),
          quantity: line.quantity,
        })),
      )
    : 0;
  return {
    id: cart.id,
    storeId: cart.store_id,
    ownerKind: cart.user_id ? "CUSTOMER" : "GUEST",
    items: lines,
    itemCount: cartItemCount(lines),
    subtotal: minorToMajor(subtotalMinor, currency),
    currency,
    hasUnavailableItems: lines.some((line) => line.availability !== "AVAILABLE"),
  };
}

async function findCustomerCart(
  client: Db,
  storeId: string,
  userId: string,
): Promise<CartRow | null> {
  const { data } = await client
    .from("carts")
    .select("*")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

async function findGuestCart(
  client: Db,
  storeId: string,
  guestToken: string,
): Promise<CartRow | null> {
  const { data } = await client
    .from("carts")
    .select("*")
    .eq("store_id", storeId)
    .eq("guest_token", guestToken)
    .maybeSingle();

  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return null;
  }
  return data;
}

async function createCustomerCart(
  client: Db,
  storeId: string,
  userId: string,
): Promise<CartRow | null> {
  const { data, error } = await client
    .from("carts")
    .insert({ store_id: storeId, user_id: userId, guest_token: null })
    .select("*")
    .single();
  if (error) return null;
  return data;
}

async function createGuestCart(
  client: Db,
  storeId: string,
  guestToken: string,
): Promise<CartRow | null> {
  const { data, error } = await client
    .from("carts")
    .insert({
      store_id: storeId,
      user_id: null,
      guest_token: guestToken,
      expires_at: guestCartExpiryDate(guestCartTtlDays()).toISOString(),
    })
    .select("*")
    .single();
  if (error) return null;
  return data;
}

async function resolveWritableCart(): Promise<{
  client: Db;
  cart: CartRow;
  storeId: string;
  currency: string;
} | { error: string }> {
  const storeId = await requireStoreId();
  if (!storeId) return { error: "Store is not configured." };

  const user = await getCurrentUser();

  if (user) {
    await mergeGuestCartIntoCustomer(user.id, storeId);
    const server = await createSupabaseServerClient();
    let cart = await findCustomerCart(server, storeId, user.id);
    if (!cart) cart = await createCustomerCart(server, storeId, user.id);
    if (!cart) return { error: friendlyDbError() };
    const currency = await loadCurrency(storeId, server);
    return { client: server, cart, storeId, currency };
  }

  const service = serviceClientOrNull();
  if (!service) {
    return {
      error:
        "Guest cart is unavailable. Configure SUPABASE_SERVICE_ROLE_KEY on the server.",
    };
  }

  const guestToken = await ensureGuestCartToken();
  let cart = await findGuestCart(service, storeId, guestToken);
  if (!cart) cart = await createGuestCart(service, storeId, guestToken);
  if (!cart) return { error: friendlyDbError() };
  const currency = await loadCurrency(storeId, service);
  return { client: service, cart, storeId, currency };
}

export async function getCurrentCart(): Promise<CartView> {
  const storeId = await requireStoreId();
  if (!storeId) return emptyCartView();

  const user = await getCurrentUser();
  const currencyClient = serviceClientOrNull() ?? (await createSupabaseServerClient());
  const currency = await loadCurrency(storeId, currencyClient);

  if (user) {
    await mergeGuestCartIntoCustomer(user.id, storeId);
    const server = await createSupabaseServerClient();
    const cart = await findCustomerCart(server, storeId, user.id);
    if (!cart) return { ...emptyCartView(currency), storeId, ownerKind: "CUSTOMER" };
    const items = await fetchCartItems(server, cart.id);
    return toCartView(cart, items, currency);
  }

  const guestToken = await readGuestCartToken();
  if (!guestToken) {
    return { ...emptyCartView(currency), storeId, ownerKind: "GUEST" };
  }

  const service = serviceClientOrNull();
  if (!service) {
    return { ...emptyCartView(currency), storeId, ownerKind: "GUEST" };
  }

  const cart = await findGuestCart(service, storeId, guestToken);
  if (!cart) {
    return { ...emptyCartView(currency), storeId, ownerKind: "GUEST" };
  }
  const items = await fetchCartItems(service, cart.id);
  return toCartView(cart, items, currency);
}

async function upsertCartItemQuantity(
  client: Db,
  cartId: string,
  productId: string,
  variantId: string,
  quantity: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await client
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", variantId)
    .maybeSingle();

  if (existing) {
    const { error } = await client
      .from("cart_items")
      .update({ quantity })
      .eq("id", existing.id)
      .eq("cart_id", cartId);
    if (error) return { ok: false, error: friendlyDbError() };
    return { ok: true };
  }

  const { error } = await client.from("cart_items").insert({
    cart_id: cartId,
    product_id: productId,
    variant_id: variantId,
    quantity,
  });

  if (error) {
    // Concurrent insert — retry as update
    if (error.code === "23505") {
      const { error: updateError } = await client
        .from("cart_items")
        .update({ quantity })
        .eq("cart_id", cartId)
        .eq("variant_id", variantId);
      if (updateError) return { ok: false, error: friendlyDbError() };
      return { ok: true };
    }
    return { ok: false, error: friendlyDbError() };
  }
  return { ok: true };
}

export async function addToCart(input: {
  productId: string;
  variantId: string;
  quantity: number;
}): Promise<CartMutationResult> {
  const resolved = await resolveWritableCart();
  if ("error" in resolved) return { ok: false, error: resolved.error };

  const { client, cart, storeId, currency } = resolved;

  const { data: existing } = await client
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("variant_id", input.variantId)
    .maybeSingle();

  const nextQuantity = (existing?.quantity ?? 0) + input.quantity;

  const validated = await validatePurchasableVariant(client, {
    storeId,
    productId: input.productId,
    variantId: input.variantId,
    requestedQuantity: nextQuantity,
  });
  if (!validated.ok) return { ok: false, error: validated.error };

  const written = await upsertCartItemQuantity(
    client,
    cart.id,
    validated.variant.productId,
    validated.variant.variantId,
    nextQuantity,
  );
  if (!written.ok) return written;

  await client
    .from("carts")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", cart.id);

  const items = await fetchCartItems(client, cart.id);
  return {
    ok: true,
    cart: toCartView(cart, items, currency),
    message: "Added to cart.",
  };
}

export async function updateCartItemQuantity(input: {
  cartItemId: string;
  quantity: number;
}): Promise<CartMutationResult> {
  const resolved = await resolveWritableCart();
  if ("error" in resolved) return { ok: false, error: resolved.error };
  const { client, cart, storeId, currency } = resolved;

  const { data: item } = await client
    .from("cart_items")
    .select("id, product_id, variant_id, cart_id")
    .eq("id", input.cartItemId)
    .eq("cart_id", cart.id)
    .maybeSingle();

  if (!item) return { ok: false, error: "Cart item not found." };

  const validated = await validatePurchasableVariant(client, {
    storeId,
    productId: item.product_id,
    variantId: item.variant_id,
    requestedQuantity: input.quantity,
  });
  if (!validated.ok) return { ok: false, error: validated.error };

  const { error } = await client
    .from("cart_items")
    .update({ quantity: input.quantity })
    .eq("id", item.id)
    .eq("cart_id", cart.id);

  if (error) return { ok: false, error: friendlyDbError() };

  const items = await fetchCartItems(client, cart.id);
  return { ok: true, cart: toCartView(cart, items, currency) };
}

export async function removeFromCart(
  cartItemId: string,
): Promise<CartMutationResult> {
  const resolved = await resolveWritableCart();
  if ("error" in resolved) return { ok: false, error: resolved.error };
  const { client, cart, currency } = resolved;

  const { error } = await client
    .from("cart_items")
    .delete()
    .eq("id", cartItemId)
    .eq("cart_id", cart.id);

  if (error) return { ok: false, error: friendlyDbError() };

  const items = await fetchCartItems(client, cart.id);
  return { ok: true, cart: toCartView(cart, items, currency) };
}

export async function clearCart(): Promise<CartMutationResult> {
  const resolved = await resolveWritableCart();
  if ("error" in resolved) return { ok: false, error: resolved.error };
  const { client, cart, currency } = resolved;

  const { error } = await client
    .from("cart_items")
    .delete()
    .eq("cart_id", cart.id);

  if (error) return { ok: false, error: friendlyDbError() };

  return {
    ok: true,
    cart: toCartView(cart, [], currency),
    message: "Cart cleared.",
  };
}

/**
 * Merge guest cart into authenticated customer cart.
 * Revalidates availability; caps quantities; deletes guest cart after success.
 */
export async function mergeGuestCartIntoCustomer(
  userId: string,
  storeId?: string,
): Promise<void> {
  const resolvedStoreId = storeId ?? (await requireStoreId());
  if (!resolvedStoreId) return;

  const guestToken = await readGuestCartToken();
  if (!guestToken) return;

  const service = serviceClientOrNull();
  if (!service) return;

  const guestCart = await findGuestCart(service, resolvedStoreId, guestToken);
  if (!guestCart) {
    await clearGuestCartCookie();
    return;
  }

  let customerCart = await findCustomerCart(service, resolvedStoreId, userId);
  if (!customerCart) {
    customerCart = await createCustomerCart(service, resolvedStoreId, userId);
  }
  if (!customerCart) return;

  const guestItems = await fetchCartItems(service, guestCart.id);

  for (const item of guestItems) {
    const validated = await validatePurchasableVariant(service, {
      storeId: resolvedStoreId,
      productId: item.product_id,
      variantId: item.variant_id,
      requestedQuantity: 1,
    });
    if (!validated.ok) continue;

    const { data: existing } = await service
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", customerCart.id)
      .eq("variant_id", item.variant_id)
      .maybeSingle();

    const merged = mergeQuantities({
      customerQuantity: existing?.quantity ?? 0,
      guestQuantity: item.quantity,
      availableStock: validated.variant.availableStock,
    });

    if (merged.quantity <= 0) continue;

    await upsertCartItemQuantity(
      service,
      customerCart.id,
      validated.variant.productId,
      validated.variant.variantId,
      merged.quantity,
    );
  }

  await service.from("cart_items").delete().eq("cart_id", guestCart.id);
  await service.from("carts").delete().eq("id", guestCart.id);
  await clearGuestCartCookie();
}

export async function mergeGuestCart(): Promise<CartMutationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to merge your cart." };
  const storeId = await requireStoreId();
  if (!storeId) return { ok: false, error: "Store is not configured." };
  await mergeGuestCartIntoCustomer(user.id, storeId);
  const cart = await getCurrentCart();
  return { ok: true, cart, message: "Cart updated." };
}
