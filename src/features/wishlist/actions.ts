"use server";

import { revalidatePath } from "next/cache";
import {
  addToWishlist,
  getWishlist,
  isInWishlist,
  removeFromWishlist,
  toggleWishlist,
} from "@/features/wishlist/service";
import type { WishlistMutationResult, WishlistView } from "@/features/wishlist/types";
import {
  addToWishlistSchema,
  removeFromWishlistSchema,
  wishlistContainsSchema,
} from "@/features/wishlist/validation";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";

function revalidateWishlistPaths() {
  revalidatePath("/account/wishlist");
}

export async function getWishlistAction(): Promise<WishlistView> {
  return getWishlist();
}

export async function addToWishlistAction(
  raw: unknown,
): Promise<WishlistMutationResult> {
  const parsed = addToWishlistSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid wishlist request.",
    };
  }

  const result = await runLoggedMutation(
    {
      type: "CART",
      source: "SERVER",
      operation: "WISHLIST_ADD",
      feature: "CART",
      entityType: "wishlist_item",
      entityId: parsed.data.productId,
      route: "/account/wishlist",
    },
    () => addToWishlist(parsed.data),
  );
  if (result.ok) revalidateWishlistPaths();
  return result;
}

export async function removeFromWishlistAction(
  raw: unknown,
): Promise<WishlistMutationResult> {
  const parsed = removeFromWishlistSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid wishlist item.",
    };
  }

  const result = await runLoggedMutation(
    {
      type: "CART",
      source: "SERVER",
      operation: "WISHLIST_REMOVE",
      feature: "CART",
      entityType: "wishlist_item",
      entityId: parsed.data.wishlistItemId,
      route: "/account/wishlist",
    },
    () => removeFromWishlist(parsed.data.wishlistItemId),
  );
  if (result.ok) revalidateWishlistPaths();
  return result;
}

export async function toggleWishlistAction(
  raw: unknown,
): Promise<WishlistMutationResult> {
  const parsed = addToWishlistSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid wishlist request.",
    };
  }

  const result = await runLoggedMutation(
    {
      type: "CART",
      source: "SERVER",
      operation: "WISHLIST_ADD",
      feature: "CART",
      entityType: "wishlist_item",
      entityId: parsed.data.productId,
      route: "/account/wishlist",
    },
    () => toggleWishlist(parsed.data),
  );
  if (result.ok) revalidateWishlistPaths();
  return result;
}

export async function isInWishlistAction(raw: unknown): Promise<boolean> {
  const parsed = wishlistContainsSchema.safeParse(raw);
  if (!parsed.success) return false;
  return isInWishlist(parsed.data);
}
