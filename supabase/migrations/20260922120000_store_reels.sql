-- Store Reels (hosted MP4 + cover) for homepage / product showcase.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.store_reels (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  title text not null default '',
  instagram_url text,
  cover_path text not null,
  video_path text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  show_on_home boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_reels_cover_path_len check (char_length(cover_path) between 1 and 500),
  constraint store_reels_video_path_len check (char_length(video_path) between 1 and 500),
  constraint store_reels_title_len check (char_length(title) <= 200),
  constraint store_reels_instagram_url_len check (
    instagram_url is null or char_length(instagram_url) <= 500
  )
);

create index if not exists store_reels_store_id_idx on public.store_reels (store_id);
create index if not exists store_reels_store_home_sort_idx
  on public.store_reels (store_id, show_on_home, is_active, sort_order);

create trigger store_reels_set_updated_at
  before update on public.store_reels
  for each row execute function public.set_updated_at();

create table if not exists public.store_reel_products (
  reel_id uuid not null references public.store_reels (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (reel_id, product_id)
);

create index if not exists store_reel_products_product_id_idx
  on public.store_reel_products (product_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.store_reels enable row level security;
alter table public.store_reel_products enable row level security;

create policy store_reels_public_read_active
  on public.store_reels for select
  using (
    (
      is_active = true
      and exists (
        select 1 from public.stores s
        where s.id = store_id and s.status = 'active'
      )
    )
    or public.is_store_admin(store_id)
  );

create policy store_reels_admin_write
  on public.store_reels for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  );

create policy store_reel_products_public_read
  on public.store_reel_products for select
  using (
    exists (
      select 1
      from public.store_reels r
      join public.stores s on s.id = r.store_id
      where r.id = reel_id
        and (
          (r.is_active = true and s.status = 'active')
          or public.is_store_admin(r.store_id)
        )
    )
  );

create policy store_reel_products_admin_write
  on public.store_reel_products for all
  using (
    exists (
      select 1 from public.store_reels r
      where r.id = reel_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
        and public.is_store_admin(r.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.store_reels r
      where r.id = reel_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
        and public.is_store_admin(r.store_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for reel videos (+ covers can stay in cms)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reels',
  'reels',
  true,
  52428800, -- 50 MB
  array['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_reels_public_read
  on storage.objects for select
  using (bucket_id = 'reels');

create policy storage_reels_admin_insert
  on storage.objects for insert
  with check (
    bucket_id = 'reels'
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
  );

create policy storage_reels_admin_update
  on storage.objects for update
  using (
    bucket_id = 'reels'
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
  )
  with check (
    bucket_id = 'reels'
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
  );

create policy storage_reels_admin_delete
  on storage.objects for delete
  using (
    bucket_id = 'reels'
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
  );

-- ---------------------------------------------------------------------------
-- Homepage section type
-- ---------------------------------------------------------------------------

alter table public.page_sections
  drop constraint if exists page_sections_section_type_check;

alter table public.page_sections
  add constraint page_sections_section_type_check
  check (section_type in (
    'hero',
    'text',
    'image',
    'banner',
    'products',
    'categories',
    'testimonials',
    'faq',
    'cta',
    'about',
    'other_information',
    'career',
    'features',
    'statistics',
    'text_image',
    'newsletter',
    'reels',
    'custom'
  ));
