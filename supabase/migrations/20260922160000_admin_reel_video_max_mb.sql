-- Configurable reel video upload limit (admin), same pattern as admin_image_max_mb.
alter table public.store_settings
  add column if not exists admin_reel_video_max_mb integer not null default 25;

alter table public.store_settings
  drop constraint if exists store_settings_admin_reel_video_max_mb_range;

alter table public.store_settings
  add constraint store_settings_admin_reel_video_max_mb_range
  check (admin_reel_video_max_mb between 2 and 50);

comment on column public.store_settings.admin_reel_video_max_mb is
  'Max size in MB for admin reel MP4/WebM uploads. Range 2–50, default 25.';

-- Ensure reels bucket allows the highest setting (50 MB).
update storage.buckets
set file_size_limit = greatest(coalesce(file_size_limit, 0), 52428800)
where id = 'reels';
