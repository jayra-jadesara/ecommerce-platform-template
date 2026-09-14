import type { QueryClient } from "@tanstack/react-query";
import {
  wishlistMembershipKey,
  wishlistMembershipQueryKey,
  wishlistQueryKey,
} from "@/features/wishlist/query-keys";
import type { WishlistView } from "@/features/wishlist/types";

/** Patch list + membership grids from mutation payload (no invalidate storm). */
export function syncWishlistQueryCaches(
  queryClient: QueryClient,
  wishlist: WishlistView,
): void {
  queryClient.setQueryData(wishlistQueryKey, wishlist);
  queryClient.setQueryData(
    wishlistMembershipQueryKey,
    wishlist.items.map((item) =>
      wishlistMembershipKey(item.productId, item.variantId),
    ),
  );
}
