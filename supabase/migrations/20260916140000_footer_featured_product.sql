-- Footer featured product + allow xlarge header logo size.

alter table public.store_settings
  add column if not exists footer_featured_product_id uuid
    references public.products (id) on delete set null,
  add column if not exists footer_show_featured_product boolean not null default false;

create index if not exists store_settings_footer_featured_product_idx
  on public.store_settings (footer_featured_product_id)
  where footer_featured_product_id is not null;

comment on column public.store_settings.footer_featured_product_id is
  'Optional product shown centered above the footer (brand highlight).';
