-- Auto-deliver shipped orders after N days + product-level returns policy.

alter table public.shipping_settings
  add column if not exists auto_deliver_after_days integer
    check (
      auto_deliver_after_days is null
      or (auto_deliver_after_days >= 1 and auto_deliver_after_days <= 60)
    );

comment on column public.shipping_settings.auto_deliver_after_days is
  'When set, SHIPPED orders move to DELIVERED after this many days with no complaint. Null disables auto-deliver.';

alter table public.products
  add column if not exists returns_allowed boolean not null default false;

comment on column public.products.returns_allowed is
  'When false, product is sold as final sale (no return / no refund). Typical for food and spices.';

alter table public.order_items
  add column if not exists returns_allowed boolean not null default true;

comment on column public.order_items.returns_allowed is
  'Snapshot of product returns policy at purchase time.';

create index if not exists orders_shipped_auto_deliver_idx
  on public.orders (store_id, status, shipped_at)
  where status = 'SHIPPED' and shipped_at is not null;

-- Align existing line items with current product policy (masala/food = final sale).
update public.order_items oi
set returns_allowed = coalesce(p.returns_allowed, false)
from public.products p
where oi.product_id = p.id;
