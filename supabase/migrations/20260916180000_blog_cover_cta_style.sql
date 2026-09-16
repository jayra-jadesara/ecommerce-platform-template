-- Cover card Read More badge style (cookie / plain / none).
alter table public.blog_settings
  add column if not exists cover_cta_style text not null default 'COOKIE';

do $$
begin
  alter table public.blog_settings
    drop constraint if exists blog_settings_cover_cta_style_check;
  alter table public.blog_settings
    add constraint blog_settings_cover_cta_style_check
    check (cover_cta_style in ('COOKIE', 'PLAIN', 'NONE'));
end $$;
