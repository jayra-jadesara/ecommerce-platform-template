"use server";

import { revalidatePath } from "next/cache";
import {
  addToCart,
  clearCart,
  getCurrentCart,
  mergeGuestCart,
  removeFromCart,
  updateCartItemQuantity,
} from "@/features/cart/service";
import type { CartMutationResult, CartView } from "@/features/cart/types";
import { emptyCartView } from "@/features/cart/types";
import {
  addToCartSchema,
  removeCartItemSchema,
  updateCartItemQuantitySchema,
} from "@/features/cart/validation";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";

function revalidateCartPaths() {
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function getCartAction(): Promise<CartView> {
  try {
    return await getCurrentCart();
  } catch {
    return emptyCartView();
  }
}

export async function addToCartAction(
  raw: unknown,
): Promise<CartMutationResult> {
  const parsed = addToCartSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid cart request.",
    };
  }

  const result = await runLoggedMutation(
    {
      type: "CART",
      source: "SERVER",
      operation: "ADD_TO_CART",
      feature: "CART",
      entityType: "cart_item",
      entityId: parsed.data.variantId,
      route: "/cart",
    },
    () => addToCart(parsed.data),
  );
  if (result.ok) revalidateCartPaths();
  return result;
}

export async function updateCartItemQuantityAction(
  raw: unknown,
): Promise<CartMutationResult> {
  const parsed = updateCartItemQuantitySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid quantity.",
    };
  }

  const result = await runLoggedMutation(
    {
      type: "CART",
      source: "SERVER",
      operation: "UPDATE_CART_ITEM",
      feature: "CART",
      entityType: "cart_item",
      entityId: parsed.data.cartItemId,
      route: "/cart",
    },
    () => updateCartItemQuantity(parsed.data),
  );
  if (result.ok) revalidateCartPaths();
  return result;
}

export async function removeFromCartAction(
  raw: unknown,
): Promise<CartMutationResult> {
  const parsed = removeCartItemSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid cart item.",
    };
  }

  const result = await removeFromCart(parsed.data.cartItemId);
  if (result.ok) revalidateCartPaths();
  return result;
}

export async function clearCartAction(): Promise<CartMutationResult> {
  const result = await clearCart();
  if (result.ok) revalidateCartPaths();
  return result;
}

export async function mergeGuestCartAction(): Promise<CartMutationResult> {
  const result = await runLoggedMutation(
    {
      type: "CART",
      source: "SERVER",
      operation: "MERGE_CART",
      feature: "CART",
      entityType: "cart",
      route: "/cart",
    },
    () => mergeGuestCart(),
  );
  if (result.ok) revalidateCartPaths();
  return result;
}
