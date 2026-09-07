-- Row Level Security policies.
-- Private tables never use open USING (true) for customer data.

-- ---------------------------------------------------------------------------
-- Enable RLS

alter table public.stores enable row level security;
alter table public.store_settings enable row level security;
alter table public.store_branding enable row level security;
alter table public.store_theme_settings enable row level security;
alter table public.store_animation_settings enable row level security;
alter table public.store_seo_settings enable row level security;
alter table public.shipping_settings enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_addresses enable row level security;
alter table public.roles enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.pages enable row level security;
alter table public.page_sections enable row level security;
alter table public.navigation_items enable row level security;
alter table public.media enable row level security;
alter table public.contact_inquiries enable row level security;
alter table public.certifications enable row level security;
alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------------------------
-- Stores & settings (public read for active storefront config)

create policy stores_public_read_active
  on public.stores for select
  using (status = 'active' or public.is_active_admin());

create policy stores_admin_write
  on public.stores for all
  using (public.has_admin_role(array['SUPER_ADMIN', 'ADMIN']))
  with check (public.has_admin_role(array['SUPER_ADMIN', 'ADMIN']));

create policy store_settings_public_read
  on public.store_settings for select
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and (s.status = 'active' or public.is_active_admin())
    )
  );

create policy store_settings_admin_write
  on public.store_settings for all
  using (public.is_store_admin(store_id))
  with check (public.is_store_admin(store_id));

create policy store_branding_public_read
  on public.store_branding for select
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and (s.status = 'active' or public.is_active_admin())
    )
  );

create policy store_branding_admin_write
  on public.store_branding for all
  using (public.is_store_admin(store_id))
  with check (public.is_store_admin(store_id));

create policy store_theme_public_read
  on public.store_theme_settings for select
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and (s.status = 'active' or public.is_active_admin())
    )
  );

create policy store_theme_admin_write
  on public.store_theme_settings for all
  using (public.is_store_admin(store_id))
  with check (public.is_store_admin(store_id));

create policy store_animation_public_read
  on public.store_animation_settings for select
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and (s.status = 'active' or public.is_active_admin())
    )
  );

create policy store_animation_admin_write
  on public.store_animation_settings for all
  using (public.is_store_admin(store_id))
  with check (public.is_store_admin(store_id));

create policy store_seo_public_read
  on public.store_seo_settings for select
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and (s.status = 'active' or public.is_active_admin())
    )
  );

create policy store_seo_admin_write
  on public.store_seo_settings for all
  using (public.is_store_admin(store_id))
  with check (public.is_store_admin(store_id));

create policy shipping_settings_public_read
  on public.shipping_settings for select
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and (s.status = 'active' or public.is_active_admin())
    )
  );

create policy shipping_settings_admin_write
  on public.shipping_settings for all
  using (public.is_store_admin(store_id))
  with check (public.is_store_admin(store_id));

-- ---------------------------------------------------------------------------
-- Profiles & addresses

create policy user_profiles_select_own_or_admin
  on public.user_profiles for select
  using (auth.uid() = id or public.is_active_admin());

create policy user_profiles_update_own
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy user_profiles_admin_update
  on public.user_profiles for update
  using (public.has_admin_role(array['SUPER_ADMIN', 'ADMIN']))
  with check (public.has_admin_role(array['SUPER_ADMIN', 'ADMIN']));

-- Inserts come from security definer trigger on auth.users.

create policy user_addresses_select_own
  on public.user_addresses for select
  using (auth.uid() = user_id or public.is_active_admin());

create policy user_addresses_insert_own
  on public.user_addresses for insert
  with check (auth.uid() = user_id);

create policy user_addresses_update_own
  on public.user_addresses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy user_addresses_delete_own
  on public.user_addresses for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Roles / admin assignment — admin only

create policy roles_admin_read
  on public.roles for select
  using (public.is_active_admin());

create policy roles_super_admin_write
  on public.roles for all
  using (public.has_admin_role(array['SUPER_ADMIN']))
  with check (public.has_admin_role(array['SUPER_ADMIN']));

create policy admin_users_admin_read
  on public.admin_users for select
  using (
    auth.uid() = user_id
    or public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
  );

create policy admin_users_super_admin_write
  on public.admin_users for all
  using (public.has_admin_role(array['SUPER_ADMIN']))
  with check (public.has_admin_role(array['SUPER_ADMIN']));

create policy admin_user_roles_admin_read
  on public.admin_user_roles for select
  using (
    auth.uid() = user_id
    or public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
  );

create policy admin_user_roles_super_admin_write
  on public.admin_user_roles for all
  using (public.has_admin_role(array['SUPER_ADMIN']))
  with check (public.has_admin_role(array['SUPER_ADMIN']));

-- ---------------------------------------------------------------------------
-- Catalog

create policy categories_public_read_active
  on public.categories for select
  using (is_active = true or public.is_store_admin(store_id));

create policy categories_admin_write
  on public.categories for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy products_public_read_active
  on public.products for select
  using (status = 'active' or public.is_store_admin(store_id));

create policy products_admin_write
  on public.products for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy product_variants_public_read_active
  on public.product_variants for select
  using (
    (
      is_active = true
      and exists (
        select 1 from public.products p
        where p.id = product_id and p.status = 'active'
      )
    )
    or exists (
      select 1 from public.products p
      where p.id = product_id and public.is_store_admin(p.store_id)
    )
  );

create policy product_variants_admin_write
  on public.product_variants for all
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
        and public.is_store_admin(p.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
        and public.is_store_admin(p.store_id)
    )
  );

create policy product_images_public_read
  on public.product_images for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and (p.status = 'active' or public.is_store_admin(p.store_id))
    )
  );

create policy product_images_admin_write
  on public.product_images for all
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
        and public.is_store_admin(p.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
        and public.is_store_admin(p.store_id)
    )
  );

create policy inventory_public_read
  on public.inventory for select
  using (
    exists (
      select 1
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = variant_id
        and (
          (pv.is_active = true and p.status = 'active')
          or public.is_store_admin(p.store_id)
        )
    )
  );

create policy inventory_admin_write
  on public.inventory for all
  using (
    exists (
      select 1
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = variant_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'ORDER_MANAGER'])
        and public.is_store_admin(p.store_id)
    )
  )
  with check (
    exists (
      select 1
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = variant_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'ORDER_MANAGER'])
        and public.is_store_admin(p.store_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Orders & payments (customers: own reads; admins: manage)

create policy orders_select_own_or_admin
  on public.orders for select
  using (
    auth.uid() = user_id
    or (
      public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
      and public.is_store_admin(store_id)
    )
  );

create policy orders_admin_write
  on public.orders for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
    and public.is_store_admin(store_id)
  );

-- Customer order creation will typically go through privileged server paths later.
-- Authenticated users may insert orders for themselves only.
create policy orders_insert_own
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy order_items_select_own_or_admin
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = auth.uid()
          or (
            public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
            and public.is_store_admin(o.store_id)
          )
        )
    )
  );

create policy order_items_admin_write
  on public.order_items for all
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
        and public.is_store_admin(o.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
        and public.is_store_admin(o.store_id)
    )
  );

create policy order_items_insert_own_order
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy payments_select_own_or_admin
  on public.payments for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.orders o
      where o.id = order_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
        and public.is_store_admin(o.store_id)
    )
  );

create policy payments_admin_write
  on public.payments for all
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
        and public.is_store_admin(o.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
        and public.is_store_admin(o.store_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Coupons: never publicly list codes; admin manage; users see own redemptions

create policy coupons_admin_all
  on public.coupons for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy coupon_redemptions_select_own_or_admin
  on public.coupon_redemptions for select
  using (
    auth.uid() = user_id
    or public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
  );

create policy coupon_redemptions_admin_write
  on public.coupon_redemptions for all
  using (public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER']))
  with check (public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER']));

-- ---------------------------------------------------------------------------
-- CMS / nav / media / certifications

create policy pages_public_read_published
  on public.pages for select
  using (status = 'published' or public.is_store_admin(store_id));

create policy pages_admin_write
  on public.pages for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy page_sections_public_read
  on public.page_sections for select
  using (
    (
      is_active = true
      and exists (
        select 1 from public.pages p
        where p.id = page_id and p.status = 'published'
      )
    )
    or exists (
      select 1 from public.pages p
      where p.id = page_id and public.is_store_admin(p.store_id)
    )
  );

create policy page_sections_admin_write
  on public.page_sections for all
  using (
    exists (
      select 1 from public.pages p
      where p.id = page_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
        and public.is_store_admin(p.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.pages p
      where p.id = page_id
        and public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
        and public.is_store_admin(p.store_id)
    )
  );

create policy navigation_items_public_read_active
  on public.navigation_items for select
  using (is_active = true or public.is_store_admin(store_id));

create policy navigation_items_admin_write
  on public.navigation_items for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy media_public_read
  on public.media for select
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and (s.status = 'active' or public.is_store_admin(store_id))
    )
  );

create policy media_admin_write
  on public.media for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

create policy certifications_public_read_active
  on public.certifications for select
  using (is_active = true or public.is_store_admin(store_id));

create policy certifications_admin_write
  on public.certifications for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

-- ---------------------------------------------------------------------------
-- Contact inquiries: anyone can submit; only admins read/manage

create policy contact_inquiries_public_insert
  on public.contact_inquiries for insert
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.status = 'active'
    )
  );

create policy contact_inquiries_admin_select
  on public.contact_inquiries for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'ORDER_MANAGER'])
    and public.is_store_admin(store_id)
  );

create policy contact_inquiries_admin_update
  on public.contact_inquiries for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'ORDER_MANAGER'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'ORDER_MANAGER'])
    and public.is_store_admin(store_id)
  );

-- ---------------------------------------------------------------------------
-- Audit logs: admins read; privileged insert (admin / later service role)

create policy audit_logs_admin_select
  on public.audit_logs for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and (store_id is null or public.is_store_admin(store_id))
  );

create policy audit_logs_admin_insert
  on public.audit_logs for insert
  with check (
    public.is_active_admin()
    and (user_id is null or user_id = auth.uid())
  );
