import { z } from "zod";
import { CART_MAX_QUANTITY } from "@/features/cart/types";

const uuid = z.string().uuid("Invalid identifier.");

export const addToCartSchema = z.object({
  productId: uuid,
  variantId: uuid,
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(CART_MAX_QUANTITY, `Quantity cannot exceed ${CART_MAX_QUANTITY}.`),
});

export const updateCartItemQuantitySchema = z.object({
  cartItemId: uuid,
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(CART_MAX_QUANTITY, `Quantity cannot exceed ${CART_MAX_QUANTITY}.`),
});

export const removeCartItemSchema = z.object({
  cartItemId: uuid,
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemQuantityInput = z.infer<
  typeof updateCartItemQuantitySchema
>;
