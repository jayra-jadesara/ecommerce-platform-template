# Phase 29 — Final performance report

## A. Baseline development timings

See [perf-phase29-baseline.md](./perf-phase29-baseline.md).

Notable pre-fix observations:

- Cold Turbopack compile for routes like `/products/[slug]` and `/cart` can dominate (tens of seconds to minutes).
- Warm `/products` client wall ~5s observed.
- Prior logs: `/account/payments` ~18–19s application-code (auth/config + client graph more than list SQL).
- Header repeatedly invoked `getCartAction()` (full cart) on storefront navigations.

## B. Warm vs cold

| Mode | Finding |
|------|---------|
| Cold | First route compile dominates; do **not** use as production proxy |
| Warm | Application-code + remote Supabase latency remain |
| Filesystem | Next warned “Slow filesystem” (~350ms) on `F:\…\.next\dev` |

## C. Header / cart problem

**Before:** `HeaderCartControl` `useQuery(getCartAction)` on every storefront page → full joins + guest merge on read for a badge.

**Change:** Count-only `getCartCountAction` / `getCartItemCount`; full cart only when drawer opens; mutations sync both caches.

## D. Cart optimization

- [`getCartItemCount`](../src/features/cart/service.ts) selects `quantity` only; **no** merge, **no** product/image joins.
- [`HeaderCartControl`](../src/features/cart/components/HeaderCartControl.tsx) split queries.
- [`syncCartQueryCaches`](../src/features/cart/sync-cart-query.ts) keeps badge + drawer aligned.

## E. Store config optimization

- Kept `unstable_cache` storefront config.
- Added React `cache()` on [`getPlatformConfigAsync`](../src/config/site.server.ts).
- Dev timing: `storefront.config`.

## F. Account page optimization

- Batched customer orders list payments + item counts.
- Batched order-detail `product_images`.
- Instrumented `payments.listCustomer` / `orders.listCustomer`.
- Dynamic-import jsPDF on receipt download (list page no longer static-imports jspdf).

## G. Product / catalog optimization

- React `cache()` on `getStorefrontProductBySlug` (metadata + page share).
- Price-sort fetch capped at 500.
- List images use `resolveOptimizedStorageUrl` (when transform env enabled).
- ProductCard uses Next Image `quality={70}` (no `unoptimized`).

## H. Admin optimization

- React `cache()` for `getCurrentUser` / `getCurrentAdmin` / shared `getAuthSessionUser`.
- Slimmed `requireAdmin` to one admin resolution path.
- No AdminShell in AppProviders (verified by test).

## I–K. Supabase / N+1 / parallel

- Orders list N+1 removed (batch `.in`).
- Order detail image N+1 removed.
- PDP related/popular already `Promise.all` (preserved).
- Indexes already present for `cart_items(cart_id)`, `payments(order_id)`, `product_images(product_id)` — **no new migration**.

## L. Image optimization

- Card thumbs: Next optimizer + optional Supabase transform widths.
- `dangerouslyAllowLocalIP` remains a **local DNS/NAT64** workaround, not a prod win.

## M–O. Providers / Three / Admin isolation

- AppProviders: MUI theme + RQ + errors only.
- Product3DViewer remains `dynamic()` direct import (not three barrel).
- jsPDF isolated behind dynamic import.

## P. Filesystem

- `F:` fixed local NTFS; still slow per Next benchmark.
- Recommend SSD path + Defender exclusions for project / `node_modules` / `.next`.

## Q. Turbopack

- Preserve `.next` cache; avoid routine deletes.
- Manifest multi-second first hit = compile, not app logic.

## R. Production build/start

`npm run build` succeeded (~287s wall on this machine).
`npm run start` Ready in ~1s.

Client wall times against `next start` (unauthenticated; account routes redirect to login):

| Route | Client ms (approx) |
|-------|--------------------|
| `/` | 2882 |
| `/products` | 1033 |
| `/cart` | 253 |
| `/blog` | 765 |
| `/manifest.webmanifest` | 69 |
| `/account/orders` | 336 (redirect) |
| `/account/payments` | 189 (redirect) |

These are **not** Core Web Vitals — wall-clock from this network to local production server + remote Supabase where applicable.

## S–V. Gates

| Gate | Result |
|------|--------|
| `npm test` | **614 passed** (incl. `tests/perf-phase29.test.ts`) |
| `npm run typecheck` | **pass** (fixed coupon type, progress dots, MUI override) |
| `npm run lint` | **pass** (0 errors; warnings remain elsewhere) |
| `npm run build` | **pass** (~287s) |

## W. Remaining bottlenecks

1. Remote Supabase RTT from local India/dev machine.
2. Global MUI still in storefront AppProviders (needed for shared theme).
3. Account date filters still pull MUI X pickers (not removed).
4. Admin order list enrichment still heavier than customer list (acceptable for now).
5. Dev cold compile / slow `F:` filesystem.

## Dev instrumentation

`[perf] operation=… durationMs=…` logs only when `NODE_ENV=development` via [`measure-server.ts`](../src/lib/perf/measure-server.ts).

## Follow-up (warm-path)

**Diagnosis from user logs:** first PDP `70s` was mostly `next.js: 62s` (cold Turbopack), not application-code (`3.9s`). Warm leftover cost was header `getCartCountAction` POSTs (~0.5–1.1s) plus Auth RTT.

| Change | Effect |
|--------|--------|
| `images.qualities: [70, 75]` | Stops quality-70 Next Image warnings |
| SSR cart via Suspense (`HeaderCartBadge`) | Shell paints without waiting on `cart.count` / Auth |
| `getCartItemCount` + React `cache()` | One count per RSC request |
| Badge `initialData` + `refetchOnMount: false` | Avoids client `getCartCountAction` spam |
| Recommend SSD path / Defender exclusions | Cold compile only |

Mutations still update both cart caches via `syncCartQueryCaches`. Full cart still loads only when the drawer opens.

## Supabase RTT (root cause of 3–10s `auth.getUser`)

Local `npm run dev` talks to **remote** `*.supabase.co`. Measured `[perf]` lines:

- `auth.getUser` 3–10s → Auth API network, not React
- `storefront.config` first ~9s then tens of ms → `unstable_cache` working
- `cart.count` 6–13s when awaited on the layout critical path (now streamed)

**Check in Supabase dashboard:** project region vs your location; paused free-tier; rate limits.  
**Optional:** latency to `https://<project>.supabase.co/auth/v1/health` from the same PC.

Production near the project region will be far closer to earlier `next start` home times (~1–3s) than local India → distant Auth. Moving the repo to a local SSD helps Turbopack cold compile only — it does **not** shrink Auth RTT.

## Follow-up

Duplicate cart/wishlist POSTs after mutations are addressed in [Phase 30](./perf-phase30.md) (cache sync + cancel stale chrome queries).
