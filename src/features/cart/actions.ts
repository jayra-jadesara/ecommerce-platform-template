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

  const result = await addToCart(parsed.data);
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

  const result = await updateCartItemQuantity(parsed.data);
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
  const result = await mergeGuestCart();
  if (result.ok) revalidateCartPaths();
  return result;
}
