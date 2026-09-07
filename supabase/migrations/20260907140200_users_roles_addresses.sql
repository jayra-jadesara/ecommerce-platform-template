-- Auth-linked profiles, addresses, and RBAC for admin access.

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  avatar_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile when a Supabase Auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, first_name, last_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------

create table public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  full_name text not null,
  phone text,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state text,
  postal_code text not null,
  country text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index user_addresses_user_id_idx on public.user_addresses (user_id);

create trigger user_addresses_set_updated_at
  before update on public.user_addresses
  for each row execute function public.set_updated_at();

-- At most one default address per user.
create unique index user_addresses_one_default_uidx
  on public.user_addresses (user_id)
  where is_default = true;

-- ---------------------------------------------------------------------------
-- Roles: database-backed RBAC (not UI-only).

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint roles_code_valid check (
    code in ('SUPER_ADMIN', 'ADMIN', 'EDITOR', 'ORDER_MANAGER')
  )
);

create unique index roles_code_uidx on public.roles (code);

create table public.admin_users (
  user_id uuid primary key references public.user_profiles (id) on delete cascade,
  store_id uuid references public.stores (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index admin_users_store_id_idx on public.admin_users (store_id);
create index admin_users_active_idx on public.admin_users (is_active);

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

create table public.admin_user_roles (
  user_id uuid not null references public.admin_users (user_id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, role_id)
);

create index admin_user_roles_role_id_idx on public.admin_user_roles (role_id);

-- ---------------------------------------------------------------------------
-- RLS helper functions (security definer; locked search_path).

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
  );
$$;

create or replace function public.has_admin_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    join public.admin_user_roles aur on aur.user_id = au.user_id
    join public.roles r on r.id = aur.role_id
    where au.user_id = auth.uid()
      and au.is_active = true
      and r.code = any (required_roles)
  );
$$;

create or replace function public.is_store_admin(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
      and (
        public.has_admin_role(array['SUPER_ADMIN'])
        or au.store_id is null
        or au.store_id = target_store_id
      )
  );
$$;

comment on function public.is_active_admin() is
  'True when the current auth user is an active admin.';
comment on function public.has_admin_role(text[]) is
  'True when the current auth user has one of the given role codes.';
comment on function public.is_store_admin(uuid) is
  'True when the current admin may manage the given store.';
