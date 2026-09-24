-- Separate Visit & reach us panel image from hero banner (off by default).
alter table public.store_settings
  add column if not exists contact_spotlight_enabled boolean not null default false,
  add column if not exists contact_spotlight_image_path text;

comment on column public.store_settings.contact_spotlight_enabled is
  'When true, show the Visit & reach us side image on /contact';
comment on column public.store_settings.contact_spotlight_image_path is
  'Storage path for Visit & reach us panel image (independent of hero banner)';
