# Phase 30 — Cache, dedupe, cancel stale requests

## Log reality check

| Hit | next.js | application-code | Takeaway |
|-----|---------|------------------|----------|
| Cold `/products` | **46s** | 19.9s | Turbopack + first Supabase (often after deleting `.next`) |
| Warm `/products` | 99ms | **982ms** | Acceptable for remote DB |
| Warm `/account/payments` | 44s cold compile | **739ms** app | Payments SQL is fine |
| Warm `/` | 3.7s | 1.5s | Suspense + config cache working |
| After wishlist/cart clicks | — | many POSTs | **Client cache bug**, not Supabase schema |

Cold compile after deleting `.next` on a slow `F:` volume can still be 10–70s — that is filesystem/Turbopack, not fixed by this phase.

## Root cause (duplicate POSTs)

1. **Cart:** Mutations called `syncCartQueryCaches` (already `setQueryData` for cart + count), then `invalidateQueries({ queryKey: cartQueryKey })`. Prefix matching also invalidated `["cart","count"]` → another `getCartCountAction` POST.
2. **Wishlist:** Toggle success invalidated both `wishlistMembershipQueryKey` and `wishlistQueryKey` (prefix). Membership observers refetched twice.

## Fixes

### Cart

- Removed redundant `invalidateQueries({ queryKey: cartQueryKey })` after `syncCartQueryCaches` in ProductCard, ProductPurchaseActions, QuickView, WishlistPageClient.
- `invalidateCartQueryCaches` now uses `exact: true` on cart and cart-count keys when invalidate is still needed.

### Wishlist

- Added [`syncWishlistQueryCaches`](../src/features/wishlist/sync-wishlist-query.ts): `setQueryData` for list + membership keys from mutation payload.
- ProductCard, ProductPurchaseActions, BlogShopProducts, WishlistPageClient use sync instead of double invalidate.

### QueryClient defaults

In [`QueryProvider`](../src/providers/QueryProvider.tsx):

- `refetchOnMount: false`
- `refetchOnReconnect: false`
- (existing) `staleTime: 60_000`, `refetchOnWindowFocus: false`

Product membership queries also set `refetchOnMount: false` explicitly.

### Cancel on navigation

On pathname change, cancel in-flight chrome queries only:

- `wishlistMembershipQueryKey`
- `["free-shipping-hint"]`

Mutations (add-to-cart, wishlist toggle, checkout/payment) are not cancelled.

## Left alone (still fine warm)

- Storefront config `unstable_cache` + React `cache`
- Auth React `cache` per request
- Suspense cart badge
- Account list batching / payments list SQL

## Success criteria (warm `/products`)

- After add-to-cart: **no** `getCartCountAction` POST (badge from `setQueryData`)
- After wishlist toggle: **zero** membership refetch when payload includes wishlist
- Soft nav `/` → `/products` → `/about`: no storm of membership/cart-count POSTs
- Cold compile after deleting `.next` may still be slow on `F:` — documented, not claimed fixed

## Related

- [Phase 29 report](./perf-phase29-report.md)
