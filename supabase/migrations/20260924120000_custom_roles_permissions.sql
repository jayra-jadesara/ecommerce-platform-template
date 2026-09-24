-- Custom roles: is_system + store scope, role_permissions catalog, permission RLS bridge.

-- ---------------------------------------------------------------------------
-- roles table extensions
-- ---------------------------------------------------------------------------
alter table public.roles
  add column if not exists is_system boolean not null default true;

alter table public.roles
  add column if not exists store_id uuid references public.stores (id) on delete cascade;

alter table public.roles
  drop constraint if exists roles_code_valid;

alter table public.roles
  add constraint roles_code_valid check (
    code in (
      'SUPER_ADMIN',
      'ADMIN',
      'EDITOR',
      'MARKETING',
      'ORDER_MANAGER',
      'SUPPORT',
      'READER'
    )
    or code ~ '^[a-z][a-z0-9_]{2,62}$'
  );

update public.roles
set is_system = true
where code in (
  'SUPER_ADMIN',
  'ADMIN',
  'EDITOR',
  'MARKETING',
  'ORDER_MANAGER',
  'SUPPORT',
  'READER'
);

create index if not exists roles_store_id_idx on public.roles (store_id)
  where store_id is not null;

-- ---------------------------------------------------------------------------
-- role_permissions
-- ---------------------------------------------------------------------------
create table if not exists public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission text not null,
  primary key (role_id, permission),
  constraint role_permissions_permission_nonempty check (length(trim(permission)) > 0)
);

create index if not exists role_permissions_permission_idx
  on public.role_permissions (permission);

comment on table public.role_permissions is
  'Permissions granted to a role (system seeded + custom Super Admin roles).';

-- ---------------------------------------------------------------------------
-- has_admin_permission / has_any_admin_permission
-- ---------------------------------------------------------------------------
create or replace function public.has_admin_permission(required_permission text)
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
    join public.role_permissions rp on rp.role_id = aur.role_id
    where au.user_id = auth.uid()
      and au.is_active = true
      and rp.permission = required_permission
  );
$$;

create or replace function public.has_any_admin_permission(required_permissions text[])
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
    join public.role_permissions rp on rp.role_id = aur.role_id
    where au.user_id = auth.uid()
      and au.is_active = true
      and rp.permission = any (required_permissions)
  );
$$;

revoke all on function public.has_admin_permission(text) from public;
revoke all on function public.has_any_admin_permission(text[]) from public;
grant execute on function public.has_admin_permission(text) to authenticated;
grant execute on function public.has_any_admin_permission(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Seed system role permissions (from app ROLE_PERMISSIONS)
-- ---------------------------------------------------------------------------
create temporary table _seed_role_perms (
  role_code text not null,
  permission text not null
) on commit drop;

insert into _seed_role_perms (role_code, permission) values
  -- SUPER_ADMIN: all (inserted via distinct list below for clarity of others; SA gets every permission string)
  ('ADMIN', 'dashboard.view'),
  ('ADMIN', 'products.view'), ('ADMIN', 'products.create'), ('ADMIN', 'products.update'), ('ADMIN', 'products.delete'),
  ('ADMIN', 'reviews.view'), ('ADMIN', 'reviews.moderate'),
  ('ADMIN', 'categories.view'), ('ADMIN', 'categories.create'), ('ADMIN', 'categories.update'), ('ADMIN', 'categories.delete'),
  ('ADMIN', 'inventory.view'), ('ADMIN', 'inventory.update'),
  ('ADMIN', 'orders.view'), ('ADMIN', 'orders.update'),
  ('ADMIN', 'customers.view'),
  ('ADMIN', 'cms.view'), ('ADMIN', 'cms.create'), ('ADMIN', 'cms.update'), ('ADMIN', 'cms.delete'),
  ('ADMIN', 'content.view'), ('ADMIN', 'content.create'), ('ADMIN', 'content.update'), ('ADMIN', 'content.delete'), ('ADMIN', 'content.publish'),
  ('ADMIN', 'media.view'), ('ADMIN', 'media.upload'), ('ADMIN', 'media.update'), ('ADMIN', 'media.delete'),
  ('ADMIN', 'product_images.view'), ('ADMIN', 'product_images.upload'), ('ADMIN', 'product_images.update'), ('ADMIN', 'product_images.delete'),
  ('ADMIN', 'settings.view'), ('ADMIN', 'settings.update'),
  ('ADMIN', 'branding.view'), ('ADMIN', 'branding.update'),
  ('ADMIN', 'navigation.view'), ('ADMIN', 'navigation.update'),
  ('ADMIN', 'seo.view'), ('ADMIN', 'seo.update'),
  ('ADMIN', 'theme.view'), ('ADMIN', 'theme.update'),
  ('ADMIN', 'shipping.view'), ('ADMIN', 'shipping.update'),
  ('ADMIN', 'payments.view'), ('ADMIN', 'payments.update'),
  ('ADMIN', 'coupons.view'), ('ADMIN', 'coupons.create'), ('ADMIN', 'coupons.update'), ('ADMIN', 'coupons.delete'),
  ('ADMIN', 'blog.view'), ('ADMIN', 'blog.create'), ('ADMIN', 'blog.update'), ('ADMIN', 'blog.delete'), ('ADMIN', 'blog.publish'),
  ('ADMIN', 'error_logs.view'), ('ADMIN', 'error_logs.update'),
  ('EDITOR', 'dashboard.view'),
  ('EDITOR', 'products.view'), ('EDITOR', 'products.create'), ('EDITOR', 'products.update'),
  ('EDITOR', 'reviews.view'), ('EDITOR', 'reviews.moderate'),
  ('EDITOR', 'categories.view'), ('EDITOR', 'categories.create'), ('EDITOR', 'categories.update'),
  ('EDITOR', 'inventory.view'), ('EDITOR', 'inventory.update'),
  ('EDITOR', 'cms.view'), ('EDITOR', 'cms.create'), ('EDITOR', 'cms.update'), ('EDITOR', 'cms.delete'),
  ('EDITOR', 'content.view'), ('EDITOR', 'content.create'), ('EDITOR', 'content.update'), ('EDITOR', 'content.delete'), ('EDITOR', 'content.publish'),
  ('EDITOR', 'media.view'), ('EDITOR', 'media.upload'), ('EDITOR', 'media.update'),
  ('EDITOR', 'product_images.view'), ('EDITOR', 'product_images.upload'), ('EDITOR', 'product_images.update'),
  ('EDITOR', 'branding.view'), ('EDITOR', 'branding.update'),
  ('EDITOR', 'navigation.view'), ('EDITOR', 'navigation.update'),
  ('EDITOR', 'seo.view'), ('EDITOR', 'seo.update'),
  ('EDITOR', 'theme.view'),
  ('EDITOR', 'shipping.view'),
  ('EDITOR', 'coupons.view'),
  ('EDITOR', 'blog.view'), ('EDITOR', 'blog.create'), ('EDITOR', 'blog.update'), ('EDITOR', 'blog.publish'),
  ('EDITOR', 'error_logs.view'),
  ('ORDER_MANAGER', 'dashboard.view'),
  ('ORDER_MANAGER', 'orders.view'), ('ORDER_MANAGER', 'orders.update'),
  ('ORDER_MANAGER', 'customers.view'),
  ('ORDER_MANAGER', 'payments.view'),
  ('ORDER_MANAGER', 'inventory.view'),
  ('ORDER_MANAGER', 'coupons.view'),
  ('ORDER_MANAGER', 'error_logs.view'),
  ('MARKETING', 'dashboard.view'),
  ('MARKETING', 'products.view'), ('MARKETING', 'categories.view'),
  ('MARKETING', 'reviews.view'), ('MARKETING', 'reviews.moderate'),
  ('MARKETING', 'cms.view'), ('MARKETING', 'cms.create'), ('MARKETING', 'cms.update'),
  ('MARKETING', 'content.view'), ('MARKETING', 'content.create'), ('MARKETING', 'content.update'), ('MARKETING', 'content.publish'),
  ('MARKETING', 'media.view'), ('MARKETING', 'media.upload'), ('MARKETING', 'media.update'),
  ('MARKETING', 'product_images.view'),
  ('MARKETING', 'branding.view'),
  ('MARKETING', 'seo.view'), ('MARKETING', 'seo.update'),
  ('MARKETING', 'coupons.view'), ('MARKETING', 'coupons.create'), ('MARKETING', 'coupons.update'), ('MARKETING', 'coupons.delete'),
  ('MARKETING', 'blog.view'), ('MARKETING', 'blog.create'), ('MARKETING', 'blog.update'), ('MARKETING', 'blog.publish'),
  ('MARKETING', 'error_logs.view'),
  ('SUPPORT', 'dashboard.view'),
  ('SUPPORT', 'products.view'), ('SUPPORT', 'categories.view'), ('SUPPORT', 'inventory.view'),
  ('SUPPORT', 'orders.view'), ('SUPPORT', 'orders.update'),
  ('SUPPORT', 'customers.view'), ('SUPPORT', 'payments.view'),
  ('SUPPORT', 'error_logs.view'),
  ('READER', 'dashboard.view'),
  ('READER', 'products.view'), ('READER', 'reviews.view'), ('READER', 'categories.view'),
  ('READER', 'inventory.view'), ('READER', 'orders.view'), ('READER', 'customers.view'),
  ('READER', 'cms.view'), ('READER', 'content.view'), ('READER', 'media.view'),
  ('READER', 'product_images.view'), ('READER', 'settings.view'), ('READER', 'branding.view'),
  ('READER', 'navigation.view'), ('READER', 'seo.view'), ('READER', 'theme.view'),
  ('READER', 'shipping.view'), ('READER', 'payments.view'), ('READER', 'coupons.view'),
  ('READER', 'blog.view'), ('READER', 'error_logs.view');

-- SUPER_ADMIN: every known permission
insert into _seed_role_perms (role_code, permission)
select 'SUPER_ADMIN', p from unnest(array[
  'dashboard.view',
  'products.view','products.create','products.update','products.delete',
  'reviews.view','reviews.moderate',
  'categories.view','categories.create','categories.update','categories.delete',
  'inventory.view','inventory.update',
  'orders.view','orders.update',
  'customers.view',
  'cms.view','cms.create','cms.update','cms.delete',
  'content.view','content.create','content.update','content.delete','content.publish',
  'media.view','media.upload','media.update','media.delete',
  'product_images.view','product_images.upload','product_images.update','product_images.delete',
  'settings.view','settings.update',
  'branding.view','branding.update',
  'navigation.view','navigation.update',
  'seo.view','seo.update',
  'theme.view','theme.update',
  'shipping.view','shipping.update',
  'payments.view','payments.update',
  'coupons.view','coupons.create','coupons.update','coupons.delete',
  'blog.view','blog.create','blog.update','blog.delete','blog.publish',
  'users.view','users.manage','audit.view',
  'error_logs.view','error_logs.update'
]::text[]) as p;

insert into public.role_permissions (role_id, permission)
select r.id, s.permission
from _seed_role_perms s
join public.roles r on r.code = s.role_code
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Hybrid RLS: OR has_admin_permission so custom roles can write
-- ---------------------------------------------------------------------------

-- Categories
drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
  for all to authenticated
  using (
    (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
      or public.has_any_admin_permission(array[
        'categories.view','categories.create','categories.update','categories.delete'
      ])
    )
    and public.is_store_admin(store_id)
  )
  with check (
    (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
      or public.has_any_admin_permission(array[
        'categories.create','categories.update','categories.delete'
      ])
    )
    and public.is_store_admin(store_id)
  );

-- Products
drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all to authenticated
  using (
    (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
      or public.has_any_admin_permission(array[
        'products.view','products.create','products.update','products.delete'
      ])
    )
    and public.is_store_admin(store_id)
  )
  with check (
    (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
      or public.has_any_admin_permission(array[
        'products.create','products.update','products.delete'
      ])
    )
    and public.is_store_admin(store_id)
  );

-- Orders update
drop policy if exists orders_admin_write on public.orders;
create policy orders_admin_write on public.orders
  for update to authenticated
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'SUPPORT'])
    or public.has_admin_permission('orders.update')
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'SUPPORT'])
    or public.has_admin_permission('orders.update')
  );

-- Media
drop policy if exists media_admin_insert on public.media;
drop policy if exists media_admin_update on public.media;
drop policy if exists media_admin_delete on public.media;

create policy media_admin_insert on public.media
  for insert to authenticated
  with check (
    (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
      or public.has_any_admin_permission(array['media.upload','media.update'])
    )
    and public.is_store_admin(store_id)
  );

create policy media_admin_update on public.media
  for update to authenticated
  using (
    (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
      or public.has_any_admin_permission(array['media.update','media.upload'])
    )
    and public.is_store_admin(store_id)
  )
  with check (
    (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
      or public.has_any_admin_permission(array['media.update','media.upload'])
    )
    and public.is_store_admin(store_id)
  );

create policy media_admin_delete on public.media
  for delete to authenticated
  using (
    (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
      or public.has_admin_permission('media.delete')
    )
    and public.is_store_admin(store_id)
  );

-- Inventory
drop policy if exists inventory_admin_insert on public.inventory;
drop policy if exists inventory_admin_update on public.inventory;
drop policy if exists inventory_admin_delete on public.inventory;

create policy inventory_admin_insert on public.inventory
  for insert to authenticated
  with check (
    (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
      or public.has_admin_permission('inventory.update')
    )
    and exists (
      select 1
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = variant_id
        and public.is_store_admin(p.store_id)
    )
  );

create policy inventory_admin_update on public.inventory
  for update to authenticated
  using (
    (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
      or public.has_admin_permission('inventory.update')
    )
    and exists (
      select 1
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = variant_id
        and public.is_store_admin(p.store_id)
    )
  )
  with check (
    (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
      or public.has_admin_permission('inventory.update')
    )
    and exists (
      select 1
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = variant_id
        and public.is_store_admin(p.store_id)
    )
  );

create policy inventory_admin_delete on public.inventory
  for delete to authenticated
  using (
    (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
      or public.has_admin_permission('inventory.update')
    )
    and exists (
      select 1
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = variant_id
        and public.is_store_admin(p.store_id)
    )
  );

-- Roles: Super Admin may insert/update/delete non-system (custom) roles only
drop policy if exists roles_super_admin_write on public.roles;
drop policy if exists roles_super_write on public.roles;

create policy roles_super_admin_insert on public.roles
  for insert to authenticated
  with check (
    public.has_admin_role(array['SUPER_ADMIN'])
    and is_system = false
  );

create policy roles_super_admin_update on public.roles
  for update to authenticated
  using (
    public.has_admin_role(array['SUPER_ADMIN'])
    and is_system = false
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN'])
    and is_system = false
  );

create policy roles_super_admin_delete on public.roles
  for delete to authenticated
  using (
    public.has_admin_role(array['SUPER_ADMIN'])
    and is_system = false
  );

-- role_permissions RLS
alter table public.role_permissions enable row level security;

drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using (
    public.is_active_admin()
    or exists (
      select 1 from public.admin_user_roles aur
      where aur.user_id = auth.uid()
        and aur.role_id = role_permissions.role_id
    )
  );

drop policy if exists role_permissions_super_write on public.role_permissions;
create policy role_permissions_super_write on public.role_permissions
  for all to authenticated
  using (
    public.has_admin_role(array['SUPER_ADMIN'])
    and exists (
      select 1 from public.roles r
      where r.id = role_id and r.is_system = false
    )
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN'])
    and exists (
      select 1 from public.roles r
      where r.id = role_id and r.is_system = false
    )
  );
