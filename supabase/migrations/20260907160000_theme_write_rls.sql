-- Tighten theme/animation writes: SUPER_ADMIN and ADMIN only.
-- EDITOR may view via public/admin read policies; app enforces theme.view.
-- ORDER_MANAGER must not update theme via RLS.

drop policy if exists store_theme_admin_write on public.store_theme_settings;
drop policy if exists store_animation_admin_write on public.store_animation_settings;

create policy store_theme_admin_insert
  on public.store_theme_settings for insert
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );

create policy store_theme_admin_update
  on public.store_theme_settings for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );

create policy store_theme_admin_delete
  on public.store_theme_settings for delete
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );

create policy store_animation_admin_insert
  on public.store_animation_settings for insert
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );

create policy store_animation_admin_update
  on public.store_animation_settings for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );

create policy store_animation_admin_delete
  on public.store_animation_settings for delete
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );
