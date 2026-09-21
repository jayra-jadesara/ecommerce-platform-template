-- Storefront customer reviews feature flag (default on).

alter table public.store_settings
  add column if not exists reviews_enabled boolean not null default true;

comment on column public.store_settings.reviews_enabled is
  'When true, product reviews UI is shown on the storefront.';
