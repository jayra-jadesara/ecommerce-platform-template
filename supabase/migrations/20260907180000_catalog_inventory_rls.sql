-- Phase 7: tighten inventory writes (ORDER_MANAGER is view-only in app).
-- Public catalog reads remain active-product scoped.

drop policy if exists inventory_admin_write on public.inventory;

create policy inventory_admin_insert
  on public.inventory for insert
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and exists (
      select 1
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = variant_id
        and public.is_store_admin(p.store_id)
    )
  );

create policy inventory_admin_update
  on public.inventory for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and exists (
      select 1
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = variant_id
        and public.is_store_admin(p.store_id)
    )
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and exists (
      select 1
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = variant_id
        and public.is_store_admin(p.store_id)
    )
  );

create policy inventory_admin_delete
  on public.inventory for delete
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and exists (
      select 1
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = variant_id
        and public.is_store_admin(p.store_id)
    )
  );
