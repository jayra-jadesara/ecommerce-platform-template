-- Products category dropdown under header Products link (off by default).
alter table public.store_settings
  add column if not exists header_products_category_menu boolean not null default false;
