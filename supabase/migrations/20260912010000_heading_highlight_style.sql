-- Phase: admin-managed heading highlighter (store-wide design preset).
-- Allow-listed in application code (wavy | box | underline | marker | double | none).

alter table public.store_theme_settings
  add column if not exists heading_highlight_style text not null default 'wavy';

alter table public.store_theme_settings
  drop constraint if exists store_theme_heading_highlight_style_check;

alter table public.store_theme_settings
  add constraint store_theme_heading_highlight_style_check
  check (
    heading_highlight_style in (
      'wavy',
      'box',
      'underline',
      'marker',
      'double',
      'none'
    )
  );

comment on column public.store_theme_settings.heading_highlight_style is
  'Store-wide section heading accent decoration (Appearance → Typography).';
