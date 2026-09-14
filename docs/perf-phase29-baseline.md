# Phase 29 — Performance baseline & findings

Measured against the running local Next.js 16.3.4 (Turbopack) app on
`F:\JD Proj\ecommerce-platform-template` (Windows fixed NTFS volume `F:`).

## Filesystem

| Item | Finding |
|------|---------|
| Drive | `F:` fixed local NTFS (`DriveType=3`) |
| Next warning | “Slow filesystem detected” (~350ms benchmark) for `.next/dev` |
| Recommendation | Prefer a fast local SSD path (e.g. `C:\dev\ecommerce-platform-template`). Exclude project / `node_modules` / `.next` from Defender real-time scan if policy allows. Do not treat network/synced folders as a code bug. |

## Development baseline (pre-fix sample)

From prior session logs + warm hits against port 3000 (existing `next dev`).
**Do not treat cold Turbopack compile as production latency.**

| Route | Notes (dev) |
|-------|-------------|
| `/` | Cold compile can be tens of seconds; warm application-code multi-second with remote Supabase |
| `/products` | Warm client ~5s observed; logs previously showed long next.js compile on cold |
| `/products/[slug]` | Cold compile observed multi-minute in log once; app work includes product + related |
| `/cart` | Can time out on cold compile |
| `/account/payments` | Prior log ~18–19s application-code — auth×2 + config + cold MUI X / jsPDF graph more likely than list SQL |
| `/manifest.webmanifest` | Multi-second mostly first compile |
| Header | `POST … getCartAction()` on many storefront pages (full cart) |

Split columns for later warm re-measure after fixes:

| Route | next.js | proxy | application-code |
|-------|---------|-------|------------------|
| `/` | (cold high / warm lower) | — | — |
| `/products` | — | — | — |
| `/account/payments` | — | — | — |
| `/manifest.webmanifest` | cold compile-dominated | — | — |

## Code hotspots confirmed before changes

1. **Header** full `getCartAction` on mount (joins + guest merge on read).
2. **Auth** no React `cache()`; layout+page double `getUser`.
3. **Orders list** per-row payment + item-count queries.
4. **Order detail** per-line `product_images` query.
5. **Product cards** `unoptimized` + full storage URLs.
6. **Payments page** static `jspdf` import on list client graph.

## After changes (engineering targets)

- Badge uses `getCartCountAction` / `cart.count` timing.
- Full cart loads when drawer opens.
- Auth/config/product-by-slug request-memoized.
- Orders list / detail batched.
- jsPDF dynamic import on download only.
- Product list image widths via transform helper when enabled; Next Image optimized on cards.
