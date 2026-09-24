-- Store-wide phone dial code (admin UI + storefront display).
alter table public.store_settings
  add column if not exists phone_country_code text not null default '+91';

comment on column public.store_settings.phone_country_code is
  'E.164-style dial code for store phones (e.g. +91). National numbers stored without this prefix.';
