-- India geo reference data for address State / City dropdowns (public read).

create table if not exists public.india_states (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.india_cities (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references public.india_states (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (state_id, name)
);

create index if not exists india_cities_state_id_idx on public.india_cities (state_id);
create index if not exists india_states_sort_order_idx on public.india_states (sort_order);

alter table public.india_states enable row level security;
alter table public.india_cities enable row level security;

drop policy if exists india_states_public_select on public.india_states;
create policy india_states_public_select
  on public.india_states for select
  to anon, authenticated
  using (true);

drop policy if exists india_cities_public_select on public.india_cities;
create policy india_cities_public_select
  on public.india_cities for select
  to anon, authenticated
  using (true);
