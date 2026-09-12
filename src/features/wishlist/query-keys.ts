export const wishlistQueryKey = ["wishlist"] as const;

/** Shared membership keys for product grids (one fetch for all cards). */
export const wishlistMembershipQueryKey = [
  ...wishlistQueryKey,
  "membership-keys",
] as const;

export function wishlistMembershipKey(
  productId: string,
  variantId?: string | null,
): string {
  return `${productId}:${variantId ?? ""}`;
}
