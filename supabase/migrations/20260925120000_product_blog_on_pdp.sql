-- Product page: linked blog strip (From our blog)
alter table public.store_settings
  add column if not exists product_blog_enabled boolean not null default true;

alter table public.store_settings
  add column if not exists product_blog_heading text not null default 'From our blog';

alter table public.store_settings
  drop constraint if exists store_settings_product_blog_heading_len;

alter table public.store_settings
  add constraint store_settings_product_blog_heading_len
  check (char_length(product_blog_heading) between 1 and 80);

comment on column public.store_settings.product_blog_enabled is
  'When true, show linked blog posts on product detail pages.';

comment on column public.store_settings.product_blog_heading is
  'Heading above linked blog posts on product detail pages.';
