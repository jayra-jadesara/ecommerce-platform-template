-- Contact page copy (Balaji-style headline + support line).
alter table public.store_settings
  add column if not exists contact_page_heading text,
  add column if not exists contact_page_support text;

comment on column public.store_settings.contact_page_heading is
  'Storefront /contact H1 (default: Let''s connect)';
comment on column public.store_settings.contact_page_support is
  'Storefront /contact support line under the heading';
