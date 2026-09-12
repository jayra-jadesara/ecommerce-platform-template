-- Expand heading highlighter with premium storefront presets.

alter table public.store_theme_settings
  drop constraint if exists store_theme_heading_highlight_style_check;

alter table public.store_theme_settings
  alter column heading_highlight_style set default 'double';

alter table public.store_theme_settings
  add constraint store_theme_heading_highlight_style_check
  check (
    heading_highlight_style in (
      'wavy',
      'box',
      'underline',
      'marker',
      'double',
      'scribble',
      'arc',
      'bracket',
      'stripe',
      'glow',
      'stamp',
      'circle',
      'brush',
      'ribbon',
      'capsule',
      'editorial',
      'gradient',
      'spark',
      'none'
    )
  );

comment on column public.store_theme_settings.heading_highlight_style is
  'Store-wide page/section heading accent decoration (Appearance → Typography).';
