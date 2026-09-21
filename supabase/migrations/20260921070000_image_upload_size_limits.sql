-- Configurable image upload limits (admin media + customer replace photos).
alter table public.store_settings
  add column if not exists admin_image_max_mb integer not null default 5;

alter table public.store_settings
  drop constraint if exists store_settings_admin_image_max_mb_range;

alter table public.store_settings
  add constraint store_settings_admin_image_max_mb_range
  check (admin_image_max_mb between 1 and 10);

comment on column public.store_settings.admin_image_max_mb is
  'Max size in MB for admin image uploads (products, media, branding). Range 1–10, default 5.';

alter table public.shipping_settings
  add column if not exists replace_photo_max_mb integer not null default 1;

alter table public.shipping_settings
  drop constraint if exists shipping_settings_replace_photo_max_mb_range;

alter table public.shipping_settings
  add constraint shipping_settings_replace_photo_max_mb_range
  check (replace_photo_max_mb between 1 and 4);

comment on column public.shipping_settings.replace_photo_max_mb is
  'Max size in MB for customer replace-order photos. Range 1–4, default 1.';

-- Raise storage bucket caps to the highest setting values so app limits can apply.
update storage.buckets
set file_size_limit = 10485760 -- 10 MB
where id in ('branding', 'categories');

update storage.buckets
set file_size_limit = 4194304 -- 4 MB
where id = 'replacements';
