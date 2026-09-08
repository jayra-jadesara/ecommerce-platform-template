-- Phase 12: Razorpay support — minor units + webhook idempotency.

alter table public.payments
  add column if not exists amount_minor bigint,
  add column if not exists pricing_version text,
  add column if not exists receipt text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Backfill minor units from major amount (assume 2 fraction digits for existing rows).
update public.payments
set amount_minor = trunc(amount * 100)::bigint
where amount_minor is null;

alter table public.payments
  alter column amount_minor set not null;

alter table public.payments
  add constraint payments_amount_minor_nonneg check (amount_minor >= 0);

create unique index if not exists payments_provider_order_id_uidx
  on public.payments (provider, provider_order_id)
  where provider_order_id is not null;

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_name text not null,
  status text not null default 'RECEIVED'
    check (status in ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED')),
  payment_id uuid references public.payments (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  payload_digest text,
  error_message text,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint payment_webhook_events_provider_event_uidx unique (provider, event_id)
);

create index if not exists payment_webhook_events_payment_id_idx
  on public.payment_webhook_events (payment_id);
create index if not exists payment_webhook_events_received_at_idx
  on public.payment_webhook_events (received_at desc);

alter table public.payment_webhook_events enable row level security;

-- Service role bypasses RLS. Admins may read for support; no public/customer access.
create policy payment_webhook_events_admin_select
  on public.payment_webhook_events for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'])
  );

-- Allow service-role audit inserts for payment pipeline (already admin-only for users).
-- No change to audit_logs policies; payment audits use service role client.
