import "server-only";

import { availableQuantity } from "@/features/catalog/stock";
import { CART_MAX_QUANTITY } from "@/features/cart/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

export type ValidatedVariant = {
  productId: string;
  variantId: string;
  storeId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  unitPrice: number;
  trackInventory: boolean;
  availableStock: number | null;
};

export type VariantValidationError = {
  ok: false;
  error: string;
};

export type VariantValidationSuccess = {
  ok: true;
  variant: ValidatedVariant;
};

export async function validatePurchasableVariant(
  client: Db,
  input: {
    storeId: string;
    productId: string;
    variantId: string;
    requestedQuantity: number;
  },
): Promise<VariantValidationSuccess | VariantValidationError> {
  if (input.requestedQuantity <= 0) {
    return { ok: false, error: "Quantity must be at least 1." };
  }
  if (input.requestedQuantity > CART_MAX_QUANTITY) {
    return {
      ok: false,
      error: `Quantity cannot exceed ${CART_MAX_QUANTITY}.`,
    };
  }

  const { data: product, error: productError } = await client
    .from("products")
    .select("id, store_id, name, slug, status")
    .eq("id", input.productId)
    .maybeSingle();

  if (productError || !product) {
    return { ok: false, error: "This product is no longer available." };
  }
  if (product.store_id !== input.storeId) {
    return { ok: false, error: "This product is not available in this store." };
  }
  if (product.status !== "active") {
    return { ok: false, error: "This product is currently unavailable." };
  }

  const { data: variant, error: variantError } = await client
    .from("product_variants")
    .select(
      `
      id, product_id, name, price, is_active, track_inventory,
      inventory ( quantity, reserved_quantity )
    `,
    )
    .eq("id", input.variantId)
    .maybeSingle();

  if (variantError || !variant) {
    return { ok: false, error: "This product option is no longer available." };
  }
  if (variant.product_id !== product.id) {
    return { ok: false, error: "Selected option does not match this product." };
  }
  if (!variant.is_active) {
    return { ok: false, error: "This product option is currently unavailable." };
  }

  const inventoryRaw = variant.inventory as unknown as
    | { quantity: number; reserved_quantity: number }
    | { quantity: number; reserved_quantity: number }[]
    | null;
  const inventory = Array.isArray(inventoryRaw)
    ? inventoryRaw[0] ?? null
    : inventoryRaw;

  let availableStock: number | null = null;
  if (variant.track_inventory) {
    if (!inventory) {
      return { ok: false, error: "This item is out of stock." };
    }
    availableStock = availableQuantity(
      inventory.quantity,
      inventory.reserved_quantity,
    );
    if (availableStock <= 0) {
      return { ok: false, error: "This item is out of stock." };
    }
    if (input.requestedQuantity > availableStock) {
      return {
        ok: false,
        error: `Only ${availableStock} available in stock.`,
      };
    }
  }

  return {
    ok: true,
    variant: {
      productId: product.id,
      variantId: variant.id,
      storeId: product.store_id,
      productName: product.name,
      productSlug: product.slug,
      variantName: variant.name,
      unitPrice: Number(variant.price),
      trackInventory: variant.track_inventory,
      availableStock,
    },
  };
}
