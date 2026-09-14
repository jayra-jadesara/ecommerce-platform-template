-- Storefront promo fields for featured coupon modal / checkout suggestion.
alter table public.coupons
  add column if not exists show_on_storefront boolean not null default false,
  add column if not exists promo_headline text,
  add column if not exists promo_subtext text,
  add column if not exists promo_image_url text;

comment on column public.coupons.show_on_storefront is
  'When true, coupon may appear on homepage modal and checkout suggestion (one per store).';
comment on column public.coupons.promo_headline is
  'Customer-facing promo headline when shown on storefront.';
comment on column public.coupons.promo_subtext is
  'Optional supporting line under the promo headline.';
comment on column public.coupons.promo_image_url is
  'Storage path or absolute URL for promo modal imagery.';

-- At most one featured storefront coupon per store.
create unique index if not exists coupons_store_one_storefront_uidx
  on public.coupons (store_id)
  where show_on_storefront = true;
