import type { QueryClient } from "@tanstack/react-query";
import { cartCountQueryKey, cartQueryKey } from "@/features/cart/query-keys";
import type { CartView } from "@/features/cart/types";

/** Keep badge count and full cart caches aligned after mutations. */
export function syncCartQueryCaches(
  queryClient: QueryClient,
  cart: CartView,
): void {
  queryClient.setQueryData(cartQueryKey, cart);
  queryClient.setQueryData(cartCountQueryKey, cart.itemCount);
}

/** Prefer syncCartQueryCaches when mutation returns a cart. Use exact keys only. */
export function invalidateCartQueryCaches(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: cartQueryKey, exact: true });
  void queryClient.invalidateQueries({
    queryKey: cartCountQueryKey,
    exact: true,
  });
}
