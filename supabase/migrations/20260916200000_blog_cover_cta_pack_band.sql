-- Add packaging-inspired Pack + Band Read More badge styles.
do $$
begin
  alter table public.blog_settings
    drop constraint if exists blog_settings_cover_cta_style_check;
  alter table public.blog_settings
    add constraint blog_settings_cover_cta_style_check
    check (
      cover_cta_style in (
        'COOKIE',
        'PLAIN',
        'MASALA',
        'PACK',
        'BAND',
        'SQUARE',
        'RIBBON',
        'STAMP',
        'NONE'
      )
    );
end $$;
