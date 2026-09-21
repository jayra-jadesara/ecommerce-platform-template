-- Add READER role: view-only admin access (app permissions + assignable staff role).

alter table public.roles
  drop constraint if exists roles_code_valid;

alter table public.roles
  add constraint roles_code_valid check (
    code in ('SUPER_ADMIN', 'ADMIN', 'EDITOR', 'ORDER_MANAGER', 'READER')
  );

insert into public.roles (code, name, description)
values (
  'READER',
  'Read',
  'View-only access across the admin — cannot create, edit, or delete'
)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;

-- View-only role on admin SELECT policies that previously excluded it.
-- Write / mutate policies intentionally omit READER.

drop policy if exists orders_select_own_or_admin on public.orders;
create policy orders_select_own_or_admin
  on public.orders
  for select
  using (
    auth.uid() = user_id
    or (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'READER'])
      and public.is_store_admin(store_id)
    )
  );

drop policy if exists order_items_select_own_or_admin on public.order_items;
create policy order_items_select_own_or_admin
  on public.order_items
  for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = auth.uid()
          or (
            public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'READER'])
            and public.is_store_admin(o.store_id)
          )
        )
    )
  );

drop policy if exists payments_select_own_or_admin on public.payments;
create policy payments_select_own_or_admin
  on public.payments
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.orders o
      where o.id = order_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'READER'])
        and public.is_store_admin(o.store_id)
    )
  );

drop policy if exists coupon_redemptions_select_own_or_admin on public.coupon_redemptions;
create policy coupon_redemptions_select_own_or_admin
  on public.coupon_redemptions
  for select
  using (
    auth.uid() = user_id
    or public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'READER'])
  );

drop policy if exists contact_inquiries_admin_select on public.contact_inquiries;
create policy contact_inquiries_admin_select
  on public.contact_inquiries
  for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'ORDER_MANAGER', 'READER'])
    and public.is_store_admin(store_id)
  );

drop policy if exists error_logs_admin_select on public.error_logs;
create policy error_logs_admin_select
  on public.error_logs
  for select
  to authenticated
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'ORDER_MANAGER', 'READER'])
  );
