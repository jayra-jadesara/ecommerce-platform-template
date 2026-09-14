-- Hot-path indexes for storefront + admin list/detail queries.
-- Complements existing single-column indexes with composites that match
-- common filters: store_id + status + sort, user_id + created_at, etc.
-- Safe / idempotent: create index if not exists.

-- ---------------------------------------------------------------------------
-- Catalog (PLP, category rails, featured, PDP image order)
-- ---------------------------------------------------------------------------

create index if not exists products_store_status_created_idx
  on public.products (store_id, status, created_at desc);

create index if not exists products_store_status_category_idx
  on public.products (store_id, status, category_id);

create index if not exists products_store_status_featured_idx
  on public.products (store_id, status, featured)
  where featured = true;

create index if not exists products_store_updated_at_idx
  on public.products (store_id, updated_at desc);

create index if not exists categories_store_active_sort_idx
  on public.categories (store_id, is_active, sort_order);

create index if not exists product_images_product_sort_idx
  on public.product_images (product_id, sort_order);

create index if not exists product_variants_product_active_idx
  on public.product_variants (product_id, is_active);

-- ---------------------------------------------------------------------------
-- Account orders / payments + checkout open payments
-- ---------------------------------------------------------------------------

create index if not exists orders_user_created_at_idx
  on public.orders (user_id, created_at desc);

-- Customer account lists exclude PENDING (checkout drafts).
create index if not exists orders_user_created_nonpending_idx
  on public.orders (user_id, created_at desc)
  where status <> 'PENDING';

create index if not exists payments_user_created_at_idx
  on public.payments (user_id, created_at desc);

create index if not exists payments_user_status_idx
  on public.payments (user_id, status);

create index if not exists payments_order_status_idx
  on public.payments (order_id, status);

-- ---------------------------------------------------------------------------
-- Wishlist membership grids (product hearts on PLP)
-- ---------------------------------------------------------------------------

create index if not exists wishlist_items_wishlist_product_idx
  on public.wishlist_items (wishlist_id, product_id);

-- ---------------------------------------------------------------------------
-- CMS / blog storefront
-- ---------------------------------------------------------------------------

create index if not exists page_sections_page_active_sort_idx
  on public.page_sections (page_id, is_active, sort_order);

create index if not exists pages_store_status_slug_idx
  on public.pages (store_id, status, slug);

create index if not exists blog_posts_store_status_published_idx
  on public.blog_posts (store_id, status, published_at desc nulls last);

create index if not exists blog_post_categories_store_category_idx
  on public.blog_post_categories (store_id, category_id);

create index if not exists blog_post_products_product_id_idx
  on public.blog_post_products (product_id);

-- ---------------------------------------------------------------------------
-- Admin / ops extras
-- ---------------------------------------------------------------------------

create index if not exists coupons_store_created_at_idx
  on public.coupons (store_id, created_at desc);

create index if not exists contact_inquiries_store_created_idx
  on public.contact_inquiries (store_id, created_at desc);

create index if not exists payment_webhook_events_order_id_idx
  on public.payment_webhook_events (order_id)
  where order_id is not null;

create index if not exists order_activities_store_created_idx
  on public.order_activities (store_id, created_at desc);

create index if not exists media_store_created_idx
  on public.media (store_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Trigram search (leading-wildcard ilike on catalog + order number)
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm;

create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);

create index if not exists products_slug_trgm_idx
  on public.products using gin (slug gin_trgm_ops);

create index if not exists orders_order_number_trgm_idx
  on public.orders using gin (order_number gin_trgm_ops);

create index if not exists coupons_code_trgm_idx
  on public.coupons using gin (code gin_trgm_ops);
