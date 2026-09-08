-- Phase 15: homepage/content builder — expand sections, page images, banners.

-- ---------------------------------------------------------------------------
-- Expand page_sections.section_type allow-list
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
    'features',
    'statistics',
    'text_image',
    'newsletter',
    'custom'
  ));

-- ---------------------------------------------------------------------------
-- Page featured / OG image paths (storage references, not binaries)
-- ---------------------------------------------------------------------------

alter table public.pages
  add column if not exists featured_image_path text;

alter table public.pages
  add column if not exists og_image_path text;

-- ---------------------------------------------------------------------------
-- Promotional banners (store-scoped)
-- ---------------------------------------------------------------------------

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  title text not null,
  description text,
  image_path text,
  link_url text,
  button_text text,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint banners_date_range check (
    starts_at is null or ends_at is null or ends_at >= starts_at
  )
);

create index if not exists banners_store_id_idx on public.banners (store_id);
create index if not exists banners_store_active_sort_idx
  on public.banners (store_id, is_active, sort_order);

create trigger banners_set_updated_at
  before update on public.banners
  for each row execute function public.set_updated_at();

alter table public.banners enable row level security;

create policy banners_public_read_active
  on public.banners for select
  using (
    (
      is_active = true
      and (starts_at is null or starts_at <= timezone('utc', now()))
      and (ends_at is null or ends_at >= timezone('utc', now()))
      and exists (
        select 1 from public.stores s
        where s.id = store_id and s.status = 'active'
      )
    )
    or public.is_store_admin(store_id)
  );

create policy banners_admin_write
  on public.banners for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

-- ---------------------------------------------------------------------------
-- Newsletter subscribers (storage only — no email delivery in this phase)
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint newsletter_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create unique index if not exists newsletter_subscribers_store_email_uidx
  on public.newsletter_subscribers (store_id, lower(email));

create index if not exists newsletter_subscribers_store_id_idx
  on public.newsletter_subscribers (store_id);

alter table public.newsletter_subscribers enable row level security;

create policy newsletter_public_insert
  on public.newsletter_subscribers for insert
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.status = 'active'
    )
  );

create policy newsletter_admin_select
  on public.newsletter_subscribers for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy newsletter_admin_delete
  on public.newsletter_subscribers for delete
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );
