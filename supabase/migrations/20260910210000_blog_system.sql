-- Phase 24: White-label Blog / Journal system
-- Dedicated blog tables (do not overload CMS pages).

-- ---------------------------------------------------------------------------
-- blog_categories
-- ---------------------------------------------------------------------------

create table public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  image_path text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint blog_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint blog_categories_name_len check (char_length(trim(name)) between 1 and 120)
);

create unique index blog_categories_store_slug_uidx
  on public.blog_categories (store_id, slug);
create index blog_categories_store_id_idx on public.blog_categories (store_id);
create index blog_categories_store_active_idx
  on public.blog_categories (store_id, is_active, sort_order);

create trigger blog_categories_set_updated_at
  before update on public.blog_categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- blog_posts
-- ---------------------------------------------------------------------------

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  title text not null,
  slug text not null,
  excerpt text,
  content text,
  featured_image_path text,
  author_name text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  og_image_path text,
  published_at timestamptz,
  reading_time_minutes integer
    check (reading_time_minutes is null or reading_time_minutes >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint blog_posts_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint blog_posts_title_len check (char_length(trim(title)) between 1 and 200)
);

create unique index blog_posts_store_slug_uidx on public.blog_posts (store_id, slug);
create index blog_posts_store_id_idx on public.blog_posts (store_id);
create index blog_posts_store_status_idx on public.blog_posts (store_id, status);
create index blog_posts_store_published_at_idx
  on public.blog_posts (store_id, published_at desc nulls last);
create index blog_posts_store_featured_idx
  on public.blog_posts (store_id, is_featured)
  where is_featured = true;

create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- blog_post_categories (many-to-many; primary category = lowest sort / first)
-- ---------------------------------------------------------------------------

create table public.blog_post_categories (
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  category_id uuid not null references public.blog_categories (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, category_id)
);

create index blog_post_categories_category_idx
  on public.blog_post_categories (category_id);
create index blog_post_categories_store_idx
  on public.blog_post_categories (store_id);

-- ---------------------------------------------------------------------------
-- blog_post_products (optional shop-this-article links)
-- ---------------------------------------------------------------------------

create table public.blog_post_products (
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, product_id)
);

create index blog_post_products_store_idx on public.blog_post_products (store_id);

-- ---------------------------------------------------------------------------
-- blog_settings (one row per store)
-- ---------------------------------------------------------------------------

create table public.blog_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  page_title text not null default 'Blog',
  page_description text,
  posts_per_page integer not null default 9
    check (posts_per_page between 1 and 48),
  show_categories boolean not null default true,
  show_author boolean not null default true,
  show_date boolean not null default true,
  show_featured_image boolean not null default true,
  show_sidebar boolean not null default true,
  show_search boolean not null default false,
  layout_preset text not null default 'FEATURED_GRID'
    check (layout_preset in ('GRID', 'LIST', 'FEATURED_GRID')),
  sidebar_preset text not null default 'SIDEBAR'
    check (sidebar_preset in ('SIDEBAR', 'TOP_FILTER', 'NONE')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger blog_settings_set_updated_at
  before update on public.blog_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_post_categories enable row level security;
alter table public.blog_post_products enable row level security;
alter table public.blog_settings enable row level security;

-- Categories: public sees active; admins see all for their store
create policy blog_categories_public_read
  on public.blog_categories for select
  using (is_active = true or public.is_store_admin(store_id));

create policy blog_categories_admin_write
  on public.blog_categories for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

-- Posts: public sees published with published_at <= now(); admins see all
create policy blog_posts_public_read
  on public.blog_posts for select
  using (
    (
      status = 'published'
      and (published_at is null or published_at <= timezone('utc', now()))
    )
    or public.is_store_admin(store_id)
  );

create policy blog_posts_admin_write
  on public.blog_posts for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

-- Join tables: readable when parent post is readable; admin write
create policy blog_post_categories_public_read
  on public.blog_post_categories for select
  using (
    exists (
      select 1 from public.blog_posts p
      where p.id = post_id
        and (
          (
            p.status = 'published'
            and (p.published_at is null or p.published_at <= timezone('utc', now()))
          )
          or public.is_store_admin(p.store_id)
        )
    )
  );

create policy blog_post_categories_admin_write
  on public.blog_post_categories for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy blog_post_products_public_read
  on public.blog_post_products for select
  using (
    exists (
      select 1 from public.blog_posts p
      where p.id = post_id
        and (
          (
            p.status = 'published'
            and (p.published_at is null or p.published_at <= timezone('utc', now()))
          )
          or public.is_store_admin(p.store_id)
        )
    )
  );

create policy blog_post_products_admin_write
  on public.blog_post_products for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

-- Settings: public read; admin write
create policy blog_settings_public_read
  on public.blog_settings for select
  using (true);

create policy blog_settings_admin_write
  on public.blog_settings for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );
