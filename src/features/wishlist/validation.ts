import { z } from "zod";

const uuid = z.string().uuid("Invalid identifier.");

export const addToWishlistSchema = z.object({
  productId: uuid,
  variantId: uuid.nullable().optional(),
});

export const removeFromWishlistSchema = z.object({
  wishlistItemId: uuid,
});

export const wishlistContainsSchema = z.object({
  productId: uuid,
  variantId: uuid.nullable().optional(),
});

export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;
