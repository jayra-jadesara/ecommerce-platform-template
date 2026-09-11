-- Phase 24.2: Blog design controls (settings expansion)
-- Additive only — does not recreate blog tables.

alter table public.blog_settings
  add column if not exists show_reading_time boolean not null default true,
  add column if not exists show_share_buttons boolean not null default true,
  add column if not exists show_related_posts boolean not null default true,
  add column if not exists show_related_products boolean not null default true,
  add column if not exists show_featured_post boolean not null default true,
  add column if not exists auto_featured_fallback boolean not null default true,
  add column if not exists featured_post_id uuid references public.blog_posts (id) on delete set null,
  add column if not exists card_style text not null default 'STANDARD',
  add column if not exists cta_title text,
  add column if not exists cta_description text,
  add column if not exists cta_button_label text,
  add column if not exists cta_button_href text;

-- Expand card_style check (drop if present, re-add).
do $$
begin
  alter table public.blog_settings
    drop constraint if exists blog_settings_card_style_check;
  alter table public.blog_settings
    add constraint blog_settings_card_style_check
    check (card_style in ('STANDARD', 'MINIMAL', 'EDITORIAL'));
exception
  when others then null;
end $$;

-- Expand sidebar_preset: SIDEBAR/TOP_FILTER remain valid (legacy);
-- RIGHT/LEFT/TOP/NONE are preferred going forward.
do $$
begin
  alter table public.blog_settings
    drop constraint if exists blog_settings_sidebar_preset_check;
  alter table public.blog_settings
    add constraint blog_settings_sidebar_preset_check
    check (
      sidebar_preset in (
        'SIDEBAR',
        'TOP_FILTER',
        'NONE',
        'RIGHT',
        'LEFT',
        'TOP'
      )
    );
exception
  when others then null;
end $$;

-- Prefer RIGHT/TOP labels without breaking existing rows.
update public.blog_settings
set sidebar_preset = 'RIGHT'
where sidebar_preset = 'SIDEBAR';

update public.blog_settings
set sidebar_preset = 'TOP'
where sidebar_preset = 'TOP_FILTER';

create index if not exists blog_settings_featured_post_id_idx
  on public.blog_settings (featured_post_id)
  where featured_post_id is not null;
