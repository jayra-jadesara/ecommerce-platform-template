-- Allow admins to log RESTOCK / ADJUSTMENT rows from Inventory (+/- and bulk set).
-- Previously only SELECT existed; order RPCs insert as security definer.

create policy inventory_movements_admin_insert
  on public.inventory_movements for insert
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'EDITOR'])
    and public.is_store_admin(store_id)
  );
