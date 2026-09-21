-- Product page review preview count (default 3, allowed 1–6).

alter table public.store_settings
  add column if not exists reviews_preview_limit integer not null default 3;

alter table public.store_settings
  drop constraint if exists store_settings_reviews_preview_limit_range;

alter table public.store_settings
  add constraint store_settings_reviews_preview_limit_range
  check (reviews_preview_limit between 1 and 6);

comment on column public.store_settings.reviews_preview_limit is
  'How many approved reviews to show on the product page preview (1–6).';
