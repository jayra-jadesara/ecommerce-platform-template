-- Optional chrome / button tokens for white-label theming.
-- Null values are derived in application code from surface/foreground/primary.

alter table public.store_theme_settings
  add column if not exists light_header_background text,
  add column if not exists light_header_foreground text,
  add column if not exists light_footer_background text,
  add column if not exists light_footer_foreground text,
  add column if not exists light_button_background text,
  add column if not exists light_button_foreground text,
  add column if not exists dark_header_background text,
  add column if not exists dark_header_foreground text,
  add column if not exists dark_footer_background text,
  add column if not exists dark_footer_foreground text,
  add column if not exists dark_button_background text,
  add column if not exists dark_button_foreground text;

comment on column public.store_theme_settings.light_header_background is
  'Optional; falls back to light_surface when null.';
comment on column public.store_theme_settings.enabled_modes is
  'Allow-list of light|dark|system. Maps to light_enabled / dark_enabled / system_enabled in the app.';
