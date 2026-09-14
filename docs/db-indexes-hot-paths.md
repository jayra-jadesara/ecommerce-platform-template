# Database indexes — hot paths (2026-09-15)

Migration: [`supabase/migrations/20260915120000_perf_hot_path_indexes.sql`](../supabase/migrations/20260915120000_perf_hot_path_indexes.sql)

## Apply

```bash
npx supabase db push
# or run the SQL in the Supabase SQL editor
```

Indexes use `if not exists` and are safe to re-run. On a busy production DB prefer applying during low traffic; large tables may take a short lock while btree/GIN builds.

## What was already indexed (do not duplicate)

Cart owner lookups, cart lines, wishlist owner uniqueness, admin order `(store_id, created_at)`, payments by `order_id`, coupon store+code, blog slug/status pieces, banners, error logs, auto-deliver SHIPPED partial — already present from earlier migrations.

## New indexes (why)

| Area | Index | Helps |
|------|--------|--------|
| Store PLP | `products (store_id, status, created_at)` | Active product lists |
| Store category | `products (store_id, status, category_id)` | Category PLP / counts |
| Featured rails | partial `products (store_id, status, featured)` | Home/CMS featured |
| Admin catalog | `products (store_id, updated_at)` | Newest-edited sort |
| Categories | `(store_id, is_active, sort_order)` | Nav / filters |
| Images | `(product_id, sort_order)` | Card + PDP image order |
| Variants | `(product_id, is_active)` | Active variant join |
| Account orders | `(user_id, created_at)` + non-PENDING partial | Order history |
| Account payments | `(user_id, created_at)` | Payments list |
| Checkout | `payments (user_id, status)` | Open CREATED/PENDING |
| Admin payment filter | `payments (order_id, status)` | Dashboard / order list filter |
| Wishlist hearts | `(wishlist_id, product_id)` | Membership batch |
| CMS pages | `(store_id, status, slug)` + active sections sort | Published pages |
| Blog | status+published, category join, product FK | Blog storefront |
| Admin search | `pg_trgm` GIN on product name/slug, order_number, coupon code | `%term%` ilike |
| Ops | coupons/store created, contacts, webhooks order_id, activities, media | Admin lists |

## Honest limits

Indexes speed **filter/sort/join** once Postgres receives the query. They do **not** shrink multi-second `auth.getUser` RTT to a distant Supabase region (see [perf-phase29-report](./perf-phase29-report.md) / [perf-phase30](./perf-phase30.md)).

After push, warm PLP / account orders / admin product search should show lower DB time in Supabase query insights when row counts grow.
