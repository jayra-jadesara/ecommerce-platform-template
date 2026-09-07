-- Phase 11: store payment/gateway fee + tax business settings (no secrets).
-- Razorpay secrets remain environment-only.

create table if not exists public.payment_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  provider text not null default 'none'
    check (provider in ('none', 'razorpay', 'other')),
  fee_enabled boolean not null default false,
  fee_type text not null default 'PERCENTAGE'
    check (fee_type in ('PERCENTAGE', 'FIXED')),
  -- PERCENTAGE: 0–100; FIXED: major currency units (same convention as shipping fees).
  fee_value numeric(12, 4) not null default 0
    check (fee_value >= 0),
  fee_basis text not null default 'SUBTOTAL_PLUS_SHIPPING'
    check (
      fee_basis in (
        'SUBTOTAL',
        'SUBTOTAL_PLUS_SHIPPING',
        'ORDER_TOTAL_BEFORE_PAYMENT_FEE'
      )
    ),
  tax_enabled boolean not null default false,
  tax_type text not null default 'PERCENTAGE'
    check (tax_type in ('PERCENTAGE', 'FIXED')),
  tax_value numeric(12, 4) not null default 0
    check (tax_value >= 0),
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payment_settings_percentage_fee_max check (
    fee_type <> 'PERCENTAGE' or fee_value <= 100
  ),
  constraint payment_settings_percentage_tax_max check (
    tax_type <> 'PERCENTAGE' or tax_value <= 100
  )
);

drop trigger if exists payment_settings_set_updated_at on public.payment_settings;
create trigger payment_settings_set_updated_at
  before update on public.payment_settings
  for each row execute function public.set_updated_at();

comment on table public.payment_settings is
  'Business payment/gateway fee and tax configuration. Provider secrets are never stored here.';

alter table public.payment_settings enable row level security;

-- Safe non-secret fee/tax config may be read for active stores (server pricing).
-- No API keys or webhook secrets exist on this table.
drop policy if exists payment_settings_public_read on public.payment_settings;
create policy payment_settings_public_read
  on public.payment_settings for select
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and (s.status = 'active' or public.is_active_admin())
    )
  );

-- Tighten shipping writes to SUPER_ADMIN / ADMIN (matches shipping.update app roles).
drop policy if exists shipping_settings_admin_write on public.shipping_settings;
create policy shipping_settings_admin_write
  on public.shipping_settings for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );

drop policy if exists payment_settings_admin_write on public.payment_settings;
create policy payment_settings_admin_write
  on public.payment_settings for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and public.is_store_admin(store_id)
  );
