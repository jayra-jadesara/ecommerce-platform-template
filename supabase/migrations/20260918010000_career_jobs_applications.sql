-- Career page: job posts + text-only applications (no CV / file storage).

-- ---------------------------------------------------------------------------
-- Expand page_sections.section_type allow-list with career
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
    'career',
    'features',
    'statistics',
    'text_image',
    'newsletter',
    'custom'
  ));

-- ---------------------------------------------------------------------------
-- Job posts (admin-managed openings)
-- ---------------------------------------------------------------------------

create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  title text not null,
  department text not null default '',
  position text not null default '',
  location text not null default '',
  state text not null default '',
  description text not null default '',
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint job_posts_title_len check (char_length(title) between 1 and 200),
  constraint job_posts_department_len check (char_length(department) <= 120),
  constraint job_posts_position_len check (char_length(position) <= 120),
  constraint job_posts_location_len check (char_length(location) <= 200),
  constraint job_posts_state_len check (char_length(state) <= 120),
  constraint job_posts_description_len check (char_length(description) <= 5000)
);

create index if not exists job_posts_store_id_idx
  on public.job_posts (store_id);

create index if not exists job_posts_store_published_sort_idx
  on public.job_posts (store_id, is_published, sort_order);

create trigger job_posts_set_updated_at
  before update on public.job_posts
  for each row execute function public.set_updated_at();

alter table public.job_posts enable row level security;

create policy job_posts_public_read
  on public.job_posts for select
  using (
    is_published = true
    and exists (
      select 1 from public.stores s
      where s.id = store_id and s.status = 'active'
    )
  );

create policy job_posts_admin_select
  on public.job_posts for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy job_posts_admin_write
  on public.job_posts for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

-- ---------------------------------------------------------------------------
-- Career applications (text only — no resume / attachment columns)
-- ---------------------------------------------------------------------------

create table if not exists public.career_applications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  job_post_id uuid references public.job_posts (id) on delete set null,
  name text not null,
  email text not null,
  phone text not null default '',
  state text not null default '',
  city text not null default '',
  department text not null default '',
  position text not null default '',
  linkedin_url text,
  message text not null default '',
  status text not null default 'NEW'
    check (status in ('NEW', 'REVIEWED', 'ARCHIVED')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint career_applications_name_len check (char_length(name) between 1 and 120),
  constraint career_applications_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint career_applications_phone_len check (char_length(phone) <= 40),
  constraint career_applications_state_len check (char_length(state) <= 120),
  constraint career_applications_city_len check (char_length(city) <= 120),
  constraint career_applications_department_len check (char_length(department) <= 120),
  constraint career_applications_position_len check (char_length(position) <= 120),
  constraint career_applications_linkedin_len check (
    linkedin_url is null or char_length(linkedin_url) <= 2048
  ),
  constraint career_applications_message_len check (char_length(message) <= 2000)
);

create index if not exists career_applications_store_created_idx
  on public.career_applications (store_id, created_at desc);

create index if not exists career_applications_store_status_idx
  on public.career_applications (store_id, status);

create trigger career_applications_set_updated_at
  before update on public.career_applications
  for each row execute function public.set_updated_at();

alter table public.career_applications enable row level security;

create policy career_applications_public_insert
  on public.career_applications for insert
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.status = 'active'
    )
  );

create policy career_applications_admin_select
  on public.career_applications for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy career_applications_admin_update
  on public.career_applications for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );
