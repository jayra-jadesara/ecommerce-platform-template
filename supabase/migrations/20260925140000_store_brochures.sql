-- Store brochures (downloadable PDFs) + size limit + download counter.

-- ---------------------------------------------------------------------------
-- Settings: PDF upload max MB (managed from Content → Brochures)
-- ---------------------------------------------------------------------------

alter table public.store_settings
  add column if not exists admin_brochure_pdf_max_mb integer not null default 10;

alter table public.store_settings
  drop constraint if exists store_settings_admin_brochure_pdf_max_mb_check;

alter table public.store_settings
  add constraint store_settings_admin_brochure_pdf_max_mb_check
  check (admin_brochure_pdf_max_mb between 1 and 20);

comment on column public.store_settings.admin_brochure_pdf_max_mb is
  'Max PDF upload size for brochures (MB). Set in Content → Brochures.';

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.store_brochures (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  title text not null,
  pdf_path text not null,
  file_size_bytes bigint not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  download_count bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_brochures_title_len check (char_length(title) between 1 and 200),
  constraint store_brochures_pdf_path_len check (char_length(pdf_path) between 1 and 500),
  constraint store_brochures_file_size_nonneg check (file_size_bytes >= 0),
  constraint store_brochures_download_count_nonneg check (download_count >= 0)
);

create index if not exists store_brochures_store_id_idx
  on public.store_brochures (store_id);

create index if not exists store_brochures_store_active_sort_idx
  on public.store_brochures (store_id, is_active, sort_order);

create trigger store_brochures_set_updated_at
  before update on public.store_brochures
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.store_brochures enable row level security;

create policy store_brochures_public_read_active
  on public.store_brochures for select
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

create policy store_brochures_admin_write
  on public.store_brochures for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  );

-- ---------------------------------------------------------------------------
-- Download counter (storefront-safe)
-- ---------------------------------------------------------------------------

create or replace function public.increment_brochure_download(p_brochure_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.store_brochures
  set download_count = download_count + 1,
      updated_at = timezone('utc', now())
  where id = p_brochure_id
    and is_active = true;
end;
$$;

revoke all on function public.increment_brochure_download(uuid) from public;
grant execute on function public.increment_brochure_download(uuid)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage bucket (public PDFs for storefront download)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brochures',
  'brochures',
  true,
  20971520, -- 20 MB (matches admin max)
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_brochures_public_read
  on storage.objects for select
  using (bucket_id = 'brochures');

create policy storage_brochures_admin_insert
  on storage.objects for insert
  with check (
    bucket_id = 'brochures'
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
  );

create policy storage_brochures_admin_update
  on storage.objects for update
  using (
    bucket_id = 'brochures'
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
  )
  with check (
    bucket_id = 'brochures'
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
  );

create policy storage_brochures_admin_delete
  on storage.objects for delete
  using (
    bucket_id = 'brochures'
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
  );
