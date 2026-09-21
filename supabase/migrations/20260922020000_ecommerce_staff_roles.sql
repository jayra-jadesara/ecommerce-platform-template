-- Ecommerce staff roles: MARKETING + SUPPORT, and keep READER.
-- Hierarchy (high → low): SUPER_ADMIN > ADMIN > EDITOR > MARKETING > ORDER_MANAGER > SUPPORT > READER

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
  );

insert into public.roles (code, name, description)
values
  (
    'MARKETING',
    'Marketing',
    'Promotions, blog, coupons, and marketing content'
  ),
  (
    'SUPPORT',
    'Support',
    'Customer help — orders and account questions'
  ),
  (
    'READER',
    'Read',
    'View-only access across the admin — cannot create, edit, or delete'
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;

-- Orders / payments / support paths: SUPPORT can view + (app-gated) update like Order Manager.
drop policy if exists orders_select_own_or_admin on public.orders;
create policy orders_select_own_or_admin
  on public.orders
  for select
  using (
    auth.uid() = user_id
    or (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'SUPPORT', 'READER'])
      and public.is_store_admin(store_id)
    )
  );

drop policy if exists orders_admin_write on public.orders;
create policy orders_admin_write
  on public.orders
  for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'SUPPORT'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'SUPPORT'])
    and public.is_store_admin(store_id)
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
            public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'SUPPORT', 'READER'])
            and public.is_store_admin(o.store_id)
          )
        )
    )
  );

drop policy if exists order_items_admin_write on public.order_items;
create policy order_items_admin_write
  on public.order_items
  for all
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'SUPPORT'])
        and public.is_store_admin(o.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'SUPPORT'])
        and public.is_store_admin(o.store_id)
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
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'SUPPORT', 'READER'])
        and public.is_store_admin(o.store_id)
    )
  );

drop policy if exists coupon_redemptions_select_own_or_admin on public.coupon_redemptions;
create policy coupon_redemptions_select_own_or_admin
  on public.coupon_redemptions
  for select
  using (
    auth.uid() = user_id
    or public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'SUPPORT', 'READER'])
  );

-- Marketing content paths: treat like EDITOR for writes they are allowed in-app.
drop policy if exists contact_inquiries_admin_select on public.contact_inquiries;
create policy contact_inquiries_admin_select
  on public.contact_inquiries
  for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING', 'ORDER_MANAGER', 'SUPPORT', 'READER'])
    and public.is_store_admin(store_id)
  );

drop policy if exists error_logs_admin_select on public.error_logs;
create policy error_logs_admin_select
  on public.error_logs
  for select
  to authenticated
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING', 'ORDER_MANAGER', 'SUPPORT', 'READER'])
  );

-- Coupons: Marketing can manage promos; Support/Reader view only where needed.
drop policy if exists coupons_admin_select on public.coupons;
create policy coupons_admin_select
  on public.coupons
  for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING', 'ORDER_MANAGER', 'SUPPORT', 'READER'])
    and public.is_store_admin(store_id)
  );

drop policy if exists coupons_admin_write on public.coupons;
create policy coupons_admin_write
  on public.coupons
  for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'MARKETING'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'MARKETING'])
    and public.is_store_admin(store_id)
  );

-- CMS / blog / pages: Marketing edits content like Editor (no product deletes).
drop policy if exists pages_admin_write on public.pages;
create policy pages_admin_write
  on public.pages
  for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  );

drop policy if exists blog_posts_admin_write on public.blog_posts;
create policy blog_posts_admin_write
  on public.blog_posts
  for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  );

drop policy if exists blog_categories_admin_write on public.blog_categories;
create policy blog_categories_admin_write
  on public.blog_categories
  for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  );

drop policy if exists page_sections_admin_write on public.page_sections;
create policy page_sections_admin_write
  on public.page_sections
  for all
  using (
    exists (
      select 1 from public.pages p
      where p.id = page_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
        and public.is_store_admin(p.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.pages p
      where p.id = page_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
        and public.is_store_admin(p.store_id)
    )
  );

drop policy if exists banners_admin_write on public.banners;
create policy banners_admin_write
  on public.banners
  for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  );

drop policy if exists media_admin_insert on public.media;
create policy media_admin_insert
  on public.media
  for insert
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  );

drop policy if exists media_admin_update on public.media;
create policy media_admin_update
  on public.media
  for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MARKETING'])
    and public.is_store_admin(store_id)
  );
