-- Storefront page loader style + label (admin-selectable).

alter table public.store_settings
  add column if not exists storefront_loader_style text not null default 'spinner';

alter table public.store_settings
  drop constraint if exists store_settings_storefront_loader_style_check;

alter table public.store_settings
  add constraint store_settings_storefront_loader_style_check
    check (storefront_loader_style in ('spinner', 'ring', 'dots', 'pulse', 'bars'));

alter table public.store_settings
  add column if not exists storefront_loader_label text not null default 'Loading…';

alter table public.store_settings
  drop constraint if exists store_settings_storefront_loader_label_len;

alter table public.store_settings
  add constraint store_settings_storefront_loader_label_len
    check (char_length(storefront_loader_label) between 1 and 40);

comment on column public.store_settings.storefront_loader_style is
  'Storefront LoadingState visual: spinner | ring | dots | pulse | bars.';
comment on column public.store_settings.storefront_loader_label is
  'Default label for full-page storefront loading screens.';
