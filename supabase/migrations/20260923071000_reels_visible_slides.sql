-- Global carousel peek count for homepage + product reels showcases.
alter table public.store_settings
  add column if not exists reels_visible_slides integer not null default 3;

alter table public.store_settings
  drop constraint if exists store_settings_reels_visible_slides_range;

alter table public.store_settings
  add constraint store_settings_reels_visible_slides_range
  check (reels_visible_slides >= 1 and reels_visible_slides <= 5);

comment on column public.store_settings.reels_visible_slides is
  'How many reels peek in the carousel at once on home and product pages (1–5).';
