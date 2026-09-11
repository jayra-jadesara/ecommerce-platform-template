-- Phase 27: Centralized error monitoring (error_logs).
-- Private store-scoped logs. Browser clients NEVER insert directly — service role only.

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  reference_id text not null,
  store_id uuid references public.stores (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  user_login text,
  user_role text,
  error_type text not null
    check (error_type in (
      'BROWSER', 'REACT', 'PAGE', 'SERVER', 'DATABASE', 'API', 'AUTH',
      'CART', 'CHECKOUT', 'PAYMENT', 'WEBHOOK', 'ORDER', 'INVENTORY',
      'STORAGE', 'CMS', 'UNKNOWN'
    )),
  error_source text not null
    check (error_source in ('CLIENT', 'SERVER', 'DATABASE', 'WEBHOOK', 'PROVIDER')),
  severity text not null default 'ERROR'
    check (severity in ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED')),
  message text not null,
  safe_message text not null default 'We''re looking into this issue. Please try again in a moment.',
  stack text,
  file_name text,
  line_number integer,
  column_number integer,
  function_name text,
  route text,
  page_name text,
  request_method text,
  request_path text,
  http_status integer,
  operation text,
  feature text,
  entity_type text,
  entity_id text,
  order_id uuid,
  payment_id uuid,
  provider text,
  provider_order_id text,
  provider_payment_id text,
  webhook_event_id text,
  error_code text,
  database_code text,
  browser_name text,
  browser_version text,
  os text,
  device_type text,
  user_agent text,
  metadata_json jsonb not null default '{}'::jsonb,
  fingerprint text not null,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  occurrence_count integer not null default 1
    check (occurrence_count >= 1),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  admin_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint error_logs_reference_id_uidx unique (reference_id)
);

create index if not exists error_logs_store_created_idx
  on public.error_logs (store_id, created_at desc);
create index if not exists error_logs_severity_status_idx
  on public.error_logs (severity, status);
create index if not exists error_logs_type_source_idx
  on public.error_logs (error_type, error_source);
create index if not exists error_logs_fingerprint_open_idx
  on public.error_logs (store_id, fingerprint, status)
  where status in ('OPEN', 'INVESTIGATING');
create index if not exists error_logs_route_idx
  on public.error_logs (route);
create index if not exists error_logs_order_payment_idx
  on public.error_logs (order_id, payment_id);
create index if not exists error_logs_feature_idx
  on public.error_logs (feature);

create trigger error_logs_set_updated_at
  before update on public.error_logs
  for each row execute function public.set_updated_at();

alter table public.error_logs enable row level security;

-- No public SELECT. Admins with store scope may read.
create policy error_logs_admin_select
  on public.error_logs for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'ORDER_MANAGER'])
    and (store_id is null or public.is_store_admin(store_id))
  );

-- Status transitions: SUPER_ADMIN / ADMIN only.
create policy error_logs_admin_update
  on public.error_logs for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and (store_id is null or public.is_store_admin(store_id))
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN'])
    and (store_id is null or public.is_store_admin(store_id))
  );

-- Intentionally NO insert policy for authenticated/anon.
-- Inserts happen only via service role (server logger / /api/errors).

comment on table public.error_logs is
  'Phase 27 centralized application error logs. Private; service-role writes only. Retention: 90 days recommended (preserve OPEN/CRITICAL).';
