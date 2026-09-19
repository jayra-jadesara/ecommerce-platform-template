-- Header logo hang (Balaji-style overlap into hero) + allow xlarge logo size.

alter table public.store_settings
  add column if not exists header_logo_hang text not null default 'none';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'store_settings_header_logo_size_check'
  ) then
    alter table public.store_settings
      drop constraint store_settings_header_logo_size_check;
  end if;

  alter table public.store_settings
    add constraint store_settings_header_logo_size_check
    check (header_logo_size in ('small', 'medium', 'large', 'xlarge'));
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'store_settings_header_logo_hang_check'
  ) then
    alter table public.store_settings
      add constraint store_settings_header_logo_hang_check
      check (header_logo_hang in ('none', 'soft', 'medium', 'bold'));
  end if;
end $$;

comment on column public.store_settings.header_logo_hang is
  'How far the header logo overlaps the hero: none | soft | medium | bold (Balaji-style).';
