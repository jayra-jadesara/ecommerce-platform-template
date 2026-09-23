-- Per-reel product CTA label shown on storefront reel cards / expand modal.
alter table public.store_reels
  add column if not exists product_cta_label text not null default 'Shop';

alter table public.store_reels
  drop constraint if exists store_reels_product_cta_label_allowed;

alter table public.store_reels
  add constraint store_reels_product_cta_label_allowed
  check (
    product_cta_label in (
      'Shop',
      'Buy now',
      'View',
      'View product',
      'Explore',
      'Add to bag'
    )
  );

comment on column public.store_reels.product_cta_label is
  'Button label for linked products on storefront reels (admin dropdown).';
