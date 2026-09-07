-- Phase 8: tighten media/product_images/storage deletes to SUPER_ADMIN + ADMIN.
-- EDITOR retains insert/update for media and product images.

drop policy if exists media_admin_write on public.media;
drop policy if exists product_images_admin_write on public.product_images;
drop policy if exists storage_platform_admin_delete on storage.objects;

create policy media_admin_insert
  on public.media for insert
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy media_admin_update
  on public.media for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy media_admin_delete
  on public.media for delete
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );

create policy product_images_admin_insert
  on public.product_images for insert
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
        and public.is_store_admin(p.store_id)
    )
  );

create policy product_images_admin_update
  on public.product_images for update
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
        and public.is_store_admin(p.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
        and public.is_store_admin(p.store_id)
    )
  );

create policy product_images_admin_delete
  on public.product_images for delete
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
        and public.is_store_admin(p.store_id)
    )
  );

create policy storage_platform_admin_delete
  on storage.objects for delete
  using (
    bucket_id in ('branding', 'products', 'categories', 'cms', 'media')
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
  );
