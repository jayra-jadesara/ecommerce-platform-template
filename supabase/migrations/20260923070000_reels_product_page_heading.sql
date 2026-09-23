-- Product page reels section heading (storefront), managed in Content → Reels → Settings.
alter table public.store_settings
  add column if not exists reels_product_page_heading text not null default 'Seen in reels';

alter table public.store_settings
  drop constraint if exists store_settings_reels_product_page_heading_len;

alter table public.store_settings
  add constraint store_settings_reels_product_page_heading_len
  check (char_length(reels_product_page_heading) between 1 and 80);

comment on column public.store_settings.reels_product_page_heading is
  'Heading for the reels showcase on product detail pages.';
