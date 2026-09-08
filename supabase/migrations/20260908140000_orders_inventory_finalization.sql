-- Phase 13: order fulfillment fields, inventory movements, order activity, atomic stock RPCs.

alter table public.orders
  add column if not exists shipping_provider text,
  add column if not exists tracking_number text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists inventory_finalized_at timestamptz,
  add column if not exists inventory_restored_at timestamptz;

create index if not exists orders_store_status_idx
  on public.orders (store_id, status);
create index if not exists orders_store_created_at_idx
  on public.orders (store_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Inventory movements (idempotent sale / restock ledger)

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  order_id uuid references public.orders (id) on delete set null,
  order_item_id uuid references public.order_items (id) on delete set null,
  movement_type text not null
    check (movement_type in ('SALE', 'RESTOCK', 'REVERSAL', 'ADJUSTMENT')),
  quantity_delta integer not null,
  quantity_after integer,
  reason text,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  -- One SALE (or REVERSAL) per order item prevents double decrement/restore.
  constraint inventory_movements_order_item_type_uidx
    unique (order_item_id, movement_type)
);

create index if not exists inventory_movements_order_id_idx
  on public.inventory_movements (order_id);
create index if not exists inventory_movements_variant_id_idx
  on public.inventory_movements (variant_id);
create index if not exists inventory_movements_store_id_idx
  on public.inventory_movements (store_id);

alter table public.inventory_movements enable row level security;

create policy inventory_movements_admin_select
  on public.inventory_movements for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

-- ---------------------------------------------------------------------------
-- Order activity timeline

create table if not exists public.order_activities (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete restrict,
  actor_user_id uuid references public.user_profiles (id) on delete set null,
  event_type text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_activities_order_id_idx
  on public.order_activities (order_id, created_at asc);

alter table public.order_activities enable row level security;

create policy order_activities_select_own_or_admin
  on public.order_activities for select
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

create policy order_activities_admin_insert
  on public.order_activities for insert
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
    and public.is_store_admin(store_id)
  );

-- ---------------------------------------------------------------------------
-- Atomic inventory finalization (idempotent via orders.inventory_finalized_at
-- and unique inventory_movements(order_item_id, SALE)).

create or replace function public.finalize_order_inventory(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_track boolean;
  v_qty_after integer;
  v_updated integer;
  v_shortages jsonb := '[]'::jsonb;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;

  if v_order.inventory_finalized_at is not null then
    return jsonb_build_object('ok', true, 'already_finalized', true);
  end if;

  for v_item in
    select
      oi.id as order_item_id,
      oi.variant_id,
      oi.quantity,
      coalesce(pv.track_inventory, false) as track_inventory
    from public.order_items oi
    left join public.product_variants pv on pv.id = oi.variant_id
    where oi.order_id = p_order_id
  loop
    if v_item.variant_id is null or not v_item.track_inventory then
      continue;
    end if;

    -- Skip if SALE already recorded (idempotent).
    if exists (
      select 1 from public.inventory_movements
      where order_item_id = v_item.order_item_id
        and movement_type = 'SALE'
    ) then
      continue;
    end if;

    update public.inventory
    set quantity = quantity - v_item.quantity
    where variant_id = v_item.variant_id
      and quantity >= v_item.quantity
    returning quantity into v_qty_after;

    get diagnostics v_updated = row_count;

    if v_updated = 0 then
      v_shortages := v_shortages || jsonb_build_array(
        jsonb_build_object(
          'variant_id', v_item.variant_id,
          'order_item_id', v_item.order_item_id,
          'quantity', v_item.quantity
        )
      );
      continue;
    end if;

    insert into public.inventory_movements (
      store_id,
      variant_id,
      order_id,
      order_item_id,
      movement_type,
      quantity_delta,
      quantity_after,
      reason
    ) values (
      v_order.store_id,
      v_item.variant_id,
      p_order_id,
      v_item.order_item_id,
      'SALE',
      -v_item.quantity,
      v_qty_after,
      'Order inventory finalization'
    );
  end loop;

  update public.orders
  set inventory_finalized_at = timezone('utc', now())
  where id = p_order_id;

  return jsonb_build_object(
    'ok', true,
    'already_finalized', false,
    'shortages', v_shortages
  );
end;
$$;

create or replace function public.restore_order_inventory(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_sale record;
  v_qty_after integer;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;

  if v_order.inventory_restored_at is not null then
    return jsonb_build_object('ok', true, 'already_restored', true);
  end if;

  if v_order.inventory_finalized_at is null then
    return jsonb_build_object('ok', true, 'nothing_to_restore', true);
  end if;

  for v_sale in
    select *
    from public.inventory_movements
    where order_id = p_order_id
      and movement_type = 'SALE'
  loop
    if exists (
      select 1 from public.inventory_movements
      where order_item_id = v_sale.order_item_id
        and movement_type = 'REVERSAL'
    ) then
      continue;
    end if;

    update public.inventory
    set quantity = quantity + abs(v_sale.quantity_delta)
    where variant_id = v_sale.variant_id
    returning quantity into v_qty_after;

    insert into public.inventory_movements (
      store_id,
      variant_id,
      order_id,
      order_item_id,
      movement_type,
      quantity_delta,
      quantity_after,
      reason
    ) values (
      v_order.store_id,
      v_sale.variant_id,
      p_order_id,
      v_sale.order_item_id,
      'REVERSAL',
      abs(v_sale.quantity_delta),
      v_qty_after,
      'Order cancellation / refund restock'
    );
  end loop;

  update public.orders
  set inventory_restored_at = timezone('utc', now())
  where id = p_order_id;

  return jsonb_build_object('ok', true, 'already_restored', false);
end;
$$;

revoke all on function public.finalize_order_inventory(uuid) from public;
revoke all on function public.restore_order_inventory(uuid) from public;
grant execute on function public.finalize_order_inventory(uuid) to service_role;
grant execute on function public.restore_order_inventory(uuid) to service_role;
