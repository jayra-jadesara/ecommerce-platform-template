-- Storage buckets for media. Files are not stored in PostgreSQL.
-- Buckets: branding, products, categories, cms, media

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'branding',
    'branding',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
  ),
  (
    'products',
    'products',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'categories',
    'categories',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'cms',
    'cms',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'media',
    'media',
    false,
    26214400,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf'
    ]
  )
on conflict (id) do nothing;

-- Public read for public buckets
create policy storage_branding_public_read
  on storage.objects for select
  using (bucket_id = 'branding');

create policy storage_products_public_read
  on storage.objects for select
  using (bucket_id = 'products');

create policy storage_categories_public_read
  on storage.objects for select
  using (bucket_id = 'categories');

create policy storage_cms_public_read
  on storage.objects for select
  using (bucket_id = 'cms');

-- Private media: authenticated admins only
create policy storage_media_admin_read
  on storage.objects for select
  using (
    bucket_id = 'media'
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
  );

-- Admin upload/update/delete across platform buckets
create policy storage_platform_admin_insert
  on storage.objects for insert
  with check (
    bucket_id in ('branding', 'products', 'categories', 'cms', 'media')
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
  );

create policy storage_platform_admin_update
  on storage.objects for update
  using (
    bucket_id in ('branding', 'products', 'categories', 'cms', 'media')
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
  )
  with check (
    bucket_id in ('branding', 'products', 'categories', 'cms', 'media')
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
  );

create policy storage_platform_admin_delete
  on storage.objects for delete
  using (
    bucket_id in ('branding', 'products', 'categories', 'cms', 'media')
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
  );
