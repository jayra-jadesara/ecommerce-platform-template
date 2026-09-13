-- Replace requests + optional photo evidence (admin can require photos).

alter table public.shipping_settings
  add column if not exists replace_photo_required boolean not null default false;

comment on column public.shipping_settings.replace_photo_required is
  'When true, customers must upload a photo with a replace request. Default false to save storage.';

create table if not exists public.order_replace_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED')),
  reason text not null,
  customer_note text,
  admin_note text,
  photo_storage_path text,
  quantity integer not null default 1 check (quantity > 0),
  reviewed_by uuid references public.user_profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_replace_requests_order_id_idx
  on public.order_replace_requests (order_id);
create index if not exists order_replace_requests_store_status_idx
  on public.order_replace_requests (store_id, status);
create index if not exists order_replace_requests_user_id_idx
  on public.order_replace_requests (user_id);

-- One open request per line item at a time.
create unique index if not exists order_replace_requests_open_item_uidx
  on public.order_replace_requests (order_item_id)
  where status in ('REQUESTED', 'APPROVED');

drop trigger if exists order_replace_requests_set_updated_at on public.order_replace_requests;
create trigger order_replace_requests_set_updated_at
  before update on public.order_replace_requests
  for each row execute function public.set_updated_at();

alter table public.order_replace_requests enable row level security;

drop policy if exists order_replace_requests_select_own_or_admin on public.order_replace_requests;
create policy order_replace_requests_select_own_or_admin
  on public.order_replace_requests for select
  using (
    auth.uid() = user_id
    or (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
      and public.is_store_admin(store_id)
    )
  );

drop policy if exists order_replace_requests_insert_own on public.order_replace_requests;
create policy order_replace_requests_insert_own
  on public.order_replace_requests for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
        and o.store_id = store_id
    )
  );

drop policy if exists order_replace_requests_admin_update on public.order_replace_requests;
create policy order_replace_requests_admin_update
  on public.order_replace_requests for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
    and public.is_store_admin(store_id)
  );

-- Private evidence photos (uploaded via service role after ownership checks).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'replacements',
  'replacements',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists storage_replacements_admin_read on storage.objects;
create policy storage_replacements_admin_read
  on storage.objects for select
  using (
    bucket_id = 'replacements'
    and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'EDITOR'])
  );
