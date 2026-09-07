-- CMS, navigation, media metadata, inquiries, certifications, audit logs.

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  title text not null,
  slug text not null,
  content text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pages_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index pages_store_slug_uidx on public.pages (store_id, slug);
create index pages_store_id_idx on public.pages (store_id);
create index pages_status_idx on public.pages (status);

create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- Structured section config only — app must reject executable JS payloads.
create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  section_type text not null
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
      'custom'
    )),
  title text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index page_sections_page_id_idx on public.page_sections (page_id);
create index page_sections_sort_order_idx on public.page_sections (page_id, sort_order);

create trigger page_sections_set_updated_at
  before update on public.page_sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  location text not null
    check (location in ('header', 'footer')),
  parent_id uuid references public.navigation_items (id) on delete set null,
  label text not null,
  href text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  open_in_new_tab boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint navigation_items_parent_not_self check (parent_id is distinct from id)
);

create index navigation_items_store_id_idx on public.navigation_items (store_id);
create index navigation_items_location_idx on public.navigation_items (store_id, location);
create index navigation_items_parent_id_idx on public.navigation_items (parent_id);

create trigger navigation_items_set_updated_at
  before update on public.navigation_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Media binaries in Storage; this table is metadata only.

create table public.media (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  storage_path text not null,
  public_url text,
  file_name text not null,
  mime_type text not null,
  file_size bigint check (file_size is null or file_size >= 0),
  alt_text text,
  folder text,
  uploaded_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint media_path_nonempty check (length(trim(storage_path)) > 0)
);

create index media_store_id_idx on public.media (store_id);
create index media_folder_idx on public.media (store_id, folder);
create index media_uploaded_by_idx on public.media (uploaded_by);
create unique index media_store_path_uidx on public.media (store_id, storage_path);

create trigger media_set_updated_at
  before update on public.media
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status text not null default 'NEW'
    check (status in ('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index contact_inquiries_store_id_idx on public.contact_inquiries (store_id);
create index contact_inquiries_status_idx on public.contact_inquiries (status);
create index contact_inquiries_created_at_idx on public.contact_inquiries (created_at desc);

create trigger contact_inquiries_set_updated_at
  before update on public.contact_inquiries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  description text,
  logo_path text,
  certificate_number text,
  issued_date date,
  expiry_date date,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint certifications_date_range check (
    issued_date is null or expiry_date is null or expiry_date >= issued_date
  )
);

create index certifications_store_id_idx on public.certifications (store_id);
create index certifications_is_active_idx on public.certifications (is_active);

create trigger certifications_set_updated_at
  before update on public.certifications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores (id) on delete set null,
  user_id uuid references public.user_profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index audit_logs_store_id_idx on public.audit_logs (store_id);
create index audit_logs_user_id_idx on public.audit_logs (user_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
