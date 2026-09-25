-- Coupon-style promo strips: solid background color (image optional / unused on storefront).

alter table public.banners
  add column if not exists background_color text not null default '#E85D04';

alter table public.banners
  drop constraint if exists banners_background_color_hex;

alter table public.banners
  add constraint banners_background_color_hex
  check (background_color ~ '^#[0-9A-Fa-f]{6}$');

comment on column public.banners.background_color is
  'Hex fill for the storefront coupon-style promo strip.';
