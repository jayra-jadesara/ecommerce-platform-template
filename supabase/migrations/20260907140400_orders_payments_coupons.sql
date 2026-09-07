-- Orders, order items, payments, coupons — protect historical data (no cascade from users).

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  order_number text not null,
  user_id uuid references public.user_profiles (id) on delete set null,
  status text not null default 'PENDING'
    check (status in (
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED'
    )),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  shipping_amount numeric(12, 2) not null default 0 check (shipping_amount >= 0),
  gateway_fee numeric(12, 2) not null default 0 check (gateway_fee >= 0),
  tax_amount numeric(12, 2) not null default 0 check (tax_amount >= 0),
  grand_total numeric(12, 2) not null check (grand_total >= 0),
  currency text not null,
  shipping_address jsonb not null default '{}'::jsonb,
  billing_address jsonb not null default '{}'::jsonb,
  notes text,
  coupon_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index orders_store_order_number_uidx on public.orders (store_id, order_number);
create index orders_user_id_idx on public.orders (user_id);
create index orders_store_id_idx on public.orders (store_id);
create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Snapshots keep line history even if catalog rows change/delete later.
-- product_id / variant_id are nullable + ON DELETE SET NULL for that reason.

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name_snapshot text not null,
  variant_name_snapshot text not null,
  sku_snapshot text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

-- ---------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  user_id uuid references public.user_profiles (id) on delete set null,
  provider text not null default 'razorpay',
  provider_payment_id text,
  provider_order_id text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null,
  status text not null default 'CREATED'
    check (status in (
      'CREATED',
      'PENDING',
      'AUTHORIZED',
      'CAPTURED',
      'FAILED',
      'REFUNDED'
    )),
  payment_method text,
  paid_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index payments_order_id_idx on public.payments (order_id);
create index payments_user_id_idx on public.payments (user_id);
create index payments_status_idx on public.payments (status);
create unique index payments_provider_payment_id_uidx
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;
create index payments_provider_order_id_idx
  on public.payments (provider, provider_order_id)
  where provider_order_id is not null;

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  code text not null,
  description text,
  discount_type text not null
    check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  minimum_order_amount numeric(12, 2) check (minimum_order_amount is null or minimum_order_amount >= 0),
  maximum_discount_amount numeric(12, 2)
    check (maximum_discount_amount is null or maximum_discount_amount >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_user_limit integer check (per_user_limit is null or per_user_limit > 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coupons_percentage_max check (
    discount_type <> 'percentage' or discount_value <= 100
  ),
  constraint coupons_date_range check (
    starts_at is null or expires_at is null or expires_at >= starts_at
  )
);

create unique index coupons_store_code_uidx on public.coupons (store_id, lower(code));
create index coupons_store_id_idx on public.coupons (store_id);
create index coupons_is_active_idx on public.coupons (is_active);

create trigger coupons_set_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  user_id uuid references public.user_profiles (id) on delete set null,
  discount_amount numeric(12, 2) not null check (discount_amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint coupon_redemptions_order_unique unique (order_id)
);

create index coupon_redemptions_coupon_id_idx on public.coupon_redemptions (coupon_id);
create index coupon_redemptions_user_id_idx on public.coupon_redemptions (user_id);
