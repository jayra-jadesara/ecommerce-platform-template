-- Footer brand logo toggle (show logo under brand column).

alter table public.store_settings
  add column if not exists footer_show_logo boolean not null default false;

comment on column public.store_settings.footer_show_logo is
  'When true, show the brand logo in the footer brand column.';
