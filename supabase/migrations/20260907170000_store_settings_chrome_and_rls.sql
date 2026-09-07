-- Phase 6: header/footer/announcement/social/locale columns + tighter write RLS.
-- Do not weaken public read policies.

-- ---------------------------------------------------------------------------
-- store_settings extensions
-- ---------------------------------------------------------------------------

alter table public.store_settings
  add column if not exists contact_phone_secondary text,
  add column if not exists default_locale text not null default 'en-IN',
  add column if not exists social_instagram text,
  add column if not exists social_facebook text,
  add column if not exists social_youtube text,
  add column if not exists social_linkedin text,
  add column if not exists social_x text,
  add column if not exists social_whatsapp text,
  add column if not exists header_sticky boolean not null default true,
  add column if not exists header_search_enabled boolean not null default true,
  add column if not exists header_cart_enabled boolean not null default true,
  add column if not exists header_account_enabled boolean not null default true,
  add column if not exists header_mobile_menu_enabled boolean not null default true,
  add column if not exists header_nav_visible boolean not null default true,
  add column if not exists header_logo_size text not null default 'medium',
  add column if not exists announcement_enabled boolean not null default false,
  add column if not exists announcement_text text,
  add column if not exists announcement_url text,
  add column if not exists announcement_open_in_new_tab boolean not null default false,
  add column if not exists footer_enabled boolean not null default true,
  add column if not exists footer_description text,
  add column if not exists footer_show_contact boolean not null default true,
  add column if not exists footer_show_social boolean not null default true,
  add column if not exists footer_show_newsletter boolean not null default false,
  add column if not exists footer_nav_visible boolean not null default true,
  add column if not exists copyright_text text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'store_settings_header_logo_size_check'
  ) then
    alter table public.store_settings
      add constraint store_settings_header_logo_size_check
      check (header_logo_size in ('small', 'medium', 'large'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: settings = SUPER_ADMIN/ADMIN; branding/seo = + EDITOR
-- ---------------------------------------------------------------------------

drop policy if exists store_settings_admin_write on public.store_settings;
drop policy if exists store_branding_admin_write on public.store_branding;
drop policy if exists store_seo_admin_write on public.store_seo_settings;

create policy store_settings_admin_insert
  on public.store_settings for insert
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );

create policy store_settings_admin_update
  on public.store_settings for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );

create policy store_settings_admin_delete
  on public.store_settings for delete
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );

create policy store_branding_admin_insert
  on public.store_branding for insert
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy store_branding_admin_update
  on public.store_branding for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy store_branding_admin_delete
  on public.store_branding for delete
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy store_seo_admin_insert
  on public.store_seo_settings for insert
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy store_seo_admin_update
  on public.store_seo_settings for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy store_seo_admin_delete
  on public.store_seo_settings for delete
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );
