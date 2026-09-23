-- Instagram-link-only reels: cover/video optional; Instagram URL required for new rows.

alter table public.store_reels
  alter column cover_path drop not null;

alter table public.store_reels
  alter column video_path drop not null;

alter table public.store_reels
  drop constraint if exists store_reels_cover_path_len;

alter table public.store_reels
  drop constraint if exists store_reels_video_path_len;

alter table public.store_reels
  add constraint store_reels_cover_path_len check (
    cover_path is null or char_length(cover_path) between 1 and 500
  );

alter table public.store_reels
  add constraint store_reels_video_path_len check (
    video_path is null or char_length(video_path) between 1 and 500
  );

-- Prefer Instagram URL for playback; allow empty legacy rows but enforce non-empty when set.
alter table public.store_reels
  drop constraint if exists store_reels_instagram_url_len;

alter table public.store_reels
  add constraint store_reels_instagram_url_len check (
    instagram_url is null
    or (
      char_length(instagram_url) between 1 and 500
      and instagram_url ~* '^https?://'
    )
  );
