-- Contact page map columns (new version: 20260924210000 on remote is storefront_loader).
alter table public.store_settings
  add column if not exists contact_map_enabled boolean not null default true,
  add column if not exists contact_map_embed_url text;

comment on column public.store_settings.contact_map_enabled is
  'When true, storefront /contact shows a map (embed URL or address fallback)';
comment on column public.store_settings.contact_map_embed_url is
  'Optional Google Maps embed URL (Share → Embed). Falls back to address search.';
