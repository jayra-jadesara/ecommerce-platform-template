-- Drop unused reel cover poster; add storefront autoplay setting.

alter table public.store_reels
  drop column if exists cover_path;

alter table public.store_settings
  add column if not exists reels_autoplay_muted boolean not null default true;

comment on column public.store_settings.reels_autoplay_muted is
  'When true, homepage/product reel showcase autoplays muted.';
