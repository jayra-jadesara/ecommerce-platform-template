-- Phase 19 security hardening
-- 1) Orders/items: remove client insert paths (creation is service-role only via payment pipeline)
-- 2) Media metadata: remove anonymous library enumeration
-- 3) Coupons: align RLS write roles with app RBAC (ADMIN+)
-- 4) Storage: drop SVG from public branding / private media allowed MIME (XSS surface)

-- ---------------------------------------------------------------------------
-- Orders: privileged server path only
-- ---------------------------------------------------------------------------
drop policy if exists orders_insert_own on public.orders;
drop policy if exists order_items_insert_own_order on public.order_items;

-- ---------------------------------------------------------------------------
-- Media table: admin-only select (binaries already use public storage URLs where needed)
-- ---------------------------------------------------------------------------
drop policy if exists media_public_read on public.media;

-- media_admin_write is FOR ALL and already covers admin SELECT.
-- Explicit select for clarity / least surprise:
drop policy if exists media_admin_select on public.media;
create policy media_admin_select
  on public.media for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

-- ---------------------------------------------------------------------------
-- Coupons: EDITOR/ORDER_MANAGER may view; only SUPER_ADMIN/ADMIN may mutate
-- ---------------------------------------------------------------------------
drop policy if exists coupons_admin_all on public.coupons;

create policy coupons_admin_select
  on public.coupons for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'ORDER_MANAGER'])
    and public.is_store_admin(store_id)
  );

create policy coupons_admin_write
  on public.coupons for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );

-- ---------------------------------------------------------------------------
-- Storage MIME: remove SVG (and PDF from private media) to reduce stored XSS / drive-by
-- Favicon: keep ico types on branding; app upload path already rejects SVG.
-- ---------------------------------------------------------------------------
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon'
]
where id = 'branding';

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]
where id = 'media';
