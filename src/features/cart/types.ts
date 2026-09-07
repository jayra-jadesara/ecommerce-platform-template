export const CART_MAX_QUANTITY = 99;
export const GUEST_CART_TTL_DAYS_DEFAULT = 30;
export const GUEST_CART_COOKIE = "wl_guest_cart";

export type CartOwnerKind = "GUEST" | "CUSTOMER";

export type CartLineAvailability =
  | "AVAILABLE"
  | "OUT_OF_STOCK"
  | "INACTIVE"
  | "MISSING";

/** Pre-checkout cart line — prices are display-only until checkout recalculates. */
export type CartLineView = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
  imageAlt: string;
  availability: CartLineAvailability;
  availableStock: number | null;
};

export type CartView = {
  id: string | null;
  storeId: string | null;
  ownerKind: CartOwnerKind | null;
  items: CartLineView[];
  /** Sum of line quantities (e.g. 2+3 = 5). */
  itemCount: number;
  /** Pre-checkout subtotal from current variant prices only. */
  subtotal: number;
  currency: string;
  hasUnavailableItems: boolean;
};

export type CartMutationResult =
  | { ok: true; cart: CartView; message?: string }
  | { ok: false; error: string };

export function emptyCartView(currency = "INR"): CartView {
  return {
    id: null,
    storeId: null,
    ownerKind: null,
    items: [],
    itemCount: 0,
    subtotal: 0,
    currency,
    hasUnavailableItems: false,
  };
}

export function cartItemCount(items: Array<{ quantity: number }>): number {
  return items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
}

export function cartSubtotal(
  items: Array<{ quantity: number; unitPrice: number }>,
): number {
  return items.reduce(
    (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice),
    0,
  );
}

/**
 * Merge guest quantity into customer quantity, capped by stock and max.
 * Does not reserve inventory — only clamps the resulting cart quantity.
 */
export function mergeQuantities(input: {
  customerQuantity: number;
  guestQuantity: number;
  availableStock: number | null;
  maxQuantity?: number;
}): { quantity: number; capped: boolean } {
  const max = input.maxQuantity ?? CART_MAX_QUANTITY;
  const desired = input.customerQuantity + input.guestQuantity;
  const stockCap =
    input.availableStock == null
      ? max
      : Math.min(max, Math.max(0, input.availableStock));
  const quantity = Math.min(desired, stockCap);
  return { quantity, capped: quantity < desired };
}

export function guestCartExpiryDate(
  ttlDays = GUEST_CART_TTL_DAYS_DEFAULT,
  from = new Date(),
): Date {
  const days = Math.max(1, Math.min(365, Math.floor(ttlDays)));
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
