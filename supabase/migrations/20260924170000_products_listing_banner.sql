-- Products listing page (/products) hero banner — store-wide, not per-product.

alter table public.store_settings
  add column if not exists products_listing_banner_enabled boolean not null default false;

alter table public.store_settings
  add column if not exists products_listing_banner_image_path text;

comment on column public.store_settings.products_listing_banner_enabled is
  'When true and image path set, show hero banner on the Products listing page.';
comment on column public.store_settings.products_listing_banner_image_path is
  'Storage path for Products listing page hero banner image.';
