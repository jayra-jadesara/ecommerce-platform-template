-- Store-scoped live-sync signals for open storefront tabs (Phase 21).
-- Admin mutations insert a row; storefront clients subscribe via Realtime
-- postgres_changes and call router.refresh() / query invalidation.

create table if not exists public.storefront_sync_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  topics text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create index if not exists storefront_sync_events_store_created_idx
  on public.storefront_sync_events (store_id, created_at desc);

alter table public.storefront_sync_events enable row level security;

-- Anon/authenticated may read signals only for active stores (store isolation).
drop policy if exists storefront_sync_events_select_active on public.storefront_sync_events;
create policy storefront_sync_events_select_active
  on public.storefront_sync_events
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.stores s
      where s.id = storefront_sync_events.store_id
        and s.status = 'active'
    )
  );

-- Writes are service-role only (no insert/update/delete policies for anon).

comment on table public.storefront_sync_events is
  'Ephemeral Admin→Storefront invalidation signals. Not business data.';

-- Enable Realtime for this table (idempotent when already added).
do $$
begin
  alter publication supabase_realtime add table public.storefront_sync_events;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
