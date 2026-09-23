-- Global product CTA for all storefront reels + per-reel PDP visibility.

alter table public.store_settings
  add column if not exists reels_product_cta_label text not null default 'Shop';

alter table public.store_settings
  drop constraint if exists store_settings_reels_product_cta_label_allowed;

alter table public.store_settings
  add constraint store_settings_reels_product_cta_label_allowed
  check (
    reels_product_cta_label in (
      'Shop',
      'Buy now',
      'View',
      'View product',
      'Explore',
      'Add to bag'
    )
  );

comment on column public.store_settings.reels_product_cta_label is
  'Global product button label on storefront reel cards / expand modal.';

alter table public.store_reels
  add column if not exists show_on_product_page boolean not null default true;

comment on column public.store_reels.show_on_product_page is
  'When true, reel can appear on linked product detail pages.';
