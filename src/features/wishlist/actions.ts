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

  const result = await addToWishlist(parsed.data);
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

  const result = await removeFromWishlist(parsed.data.wishlistItemId);
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

  const result = await toggleWishlist(parsed.data);
  if (result.ok) revalidateWishlistPaths();
  return result;
}

export async function isInWishlistAction(raw: unknown): Promise<boolean> {
  const parsed = wishlistContainsSchema.safeParse(raw);
  if (!parsed.success) return false;
  return isInWishlist(parsed.data);
}
