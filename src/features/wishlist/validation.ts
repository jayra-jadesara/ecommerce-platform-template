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

export const wishlistMembershipSchema = z.object({
  items: z
    .array(
      z.object({
        productId: uuid,
        variantId: uuid.nullable().optional(),
      }),
    )
    .max(100),
});

export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;
