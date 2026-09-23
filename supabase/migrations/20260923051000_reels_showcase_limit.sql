-- Cap how many active home reels appear in the storefront showcase.
alter table public.store_settings
  add column if not exists reels_showcase_limit integer not null default 12;

alter table public.store_settings
  drop constraint if exists store_settings_reels_showcase_limit_range;

alter table public.store_settings
  add constraint store_settings_reels_showcase_limit_range
  check (reels_showcase_limit >= 1 and reels_showcase_limit <= 24);

comment on column public.store_settings.reels_showcase_limit is
  'Max number of reels shown in the homepage showcase (sorted by sort_order).';
