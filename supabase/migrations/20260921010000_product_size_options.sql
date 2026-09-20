-- Master list of Size / pack options for product variant dropdowns.

create table public.product_size_options (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint product_size_options_label_len check (
    char_length(trim(label)) between 1 and 80
  )
);

create unique index product_size_options_store_label_uidx
  on public.product_size_options (store_id, lower(trim(label)));

create index product_size_options_store_id_idx
  on public.product_size_options (store_id);

create index product_size_options_store_active_idx
  on public.product_size_options (store_id, is_active, sort_order);

create trigger product_size_options_set_updated_at
  before update on public.product_size_options
  for each row execute function public.set_updated_at();

alter table public.product_size_options enable row level security;

create policy product_size_options_admin_read
  on public.product_size_options for select
  using (public.is_store_admin(store_id));

create policy product_size_options_admin_write
  on public.product_size_options for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );
