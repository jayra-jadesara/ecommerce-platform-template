-- Allow COVER card style for Britannia-inspired blog impact grid.

do $$
begin
  alter table public.blog_settings
    drop constraint if exists blog_settings_card_style_check;
  alter table public.blog_settings
    add constraint blog_settings_card_style_check
    check (card_style in ('STANDARD', 'MINIMAL', 'EDITORIAL', 'COVER'));
exception
  when undefined_table then null;
end $$;

-- Prefer cover cards for existing stores still on STANDARD.
update public.blog_settings
set card_style = 'COVER'
where card_style = 'STANDARD';
