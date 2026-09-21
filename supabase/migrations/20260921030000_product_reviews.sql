-- Product reviews & ratings (moderated; approved-only on storefront).

-- ---------------------------------------------------------------------------
-- Denormalized aggregates on products (approved reviews only)
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists rating_avg numeric(3, 2) not null default 0,
  add column if not exists rating_count integer not null default 0;

alter table public.products
  drop constraint if exists products_rating_avg_range;
alter table public.products
  add constraint products_rating_avg_range
  check (rating_avg >= 0 and rating_avg <= 5);

alter table public.products
  drop constraint if exists products_rating_count_nonneg;
alter table public.products
  add constraint products_rating_count_nonneg
  check (rating_count >= 0);

comment on column public.products.rating_avg is
  'Average of approved review ratings (0 when none).';
comment on column public.products.rating_count is
  'Count of approved reviews.';

-- ---------------------------------------------------------------------------
-- product_reviews
-- ---------------------------------------------------------------------------
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null,
  title text,
  body text not null default '',
  /** Snapshot of display name at submit (avoids profile RLS on storefront). */
  author_name text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'hidden')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint product_reviews_rating_range check (rating between 1 and 5),
  constraint product_reviews_title_len check (
    title is null or char_length(title) <= 120
  ),
  constraint product_reviews_body_len check (char_length(body) <= 4000),
  constraint product_reviews_author_name_len check (
    author_name is null or char_length(author_name) <= 120
  ),
  constraint product_reviews_store_product_user_uidx
    unique (store_id, product_id, user_id)
);

create index if not exists product_reviews_product_status_idx
  on public.product_reviews (product_id, status);

create index if not exists product_reviews_store_status_created_idx
  on public.product_reviews (store_id, status, created_at desc);

create index if not exists product_reviews_user_id_idx
  on public.product_reviews (user_id);

drop trigger if exists product_reviews_set_updated_at on public.product_reviews;
create trigger product_reviews_set_updated_at
  before update on public.product_reviews
  for each row execute function public.set_updated_at();

comment on table public.product_reviews is
  'Customer product reviews. Storefront shows approved only; new reviews start pending.';

-- ---------------------------------------------------------------------------
-- Refresh product rating aggregates when review status/rating changes
-- ---------------------------------------------------------------------------
create or replace function public.refresh_product_rating_aggregates(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
  set
    rating_avg = coalesce(agg.avg_rating, 0),
    rating_count = coalesce(agg.cnt, 0)
  from (
    select
      round(avg(rating)::numeric, 2) as avg_rating,
      count(*)::integer as cnt
    from public.product_reviews
    where product_id = p_product_id
      and status = 'approved'
  ) agg
  where p.id = p_product_id;
end;
$$;

create or replace function public.product_reviews_refresh_aggregates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  if tg_op = 'DELETE' then
    pid := old.product_id;
  else
    pid := new.product_id;
  end if;

  perform public.refresh_product_rating_aggregates(pid);

  if tg_op = 'UPDATE'
     and old.product_id is distinct from new.product_id then
    perform public.refresh_product_rating_aggregates(old.product_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists product_reviews_aggregates_aiud on public.product_reviews;
create trigger product_reviews_aggregates_aiud
  after insert or update of rating, status, product_id or delete
  on public.product_reviews
  for each row execute function public.product_reviews_refresh_aggregates();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.product_reviews enable row level security;

drop policy if exists product_reviews_public_read_approved on public.product_reviews;
create policy product_reviews_public_read_approved
  on public.product_reviews for select
  using (
    status = 'approved'
    and exists (
      select 1 from public.stores s
      where s.id = store_id and s.status = 'active'
    )
  );

drop policy if exists product_reviews_own_select on public.product_reviews;
create policy product_reviews_own_select
  on public.product_reviews for select to authenticated
  using (user_id = auth.uid());

drop policy if exists product_reviews_own_insert on public.product_reviews;
create policy product_reviews_own_insert
  on public.product_reviews for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.stores s
      where s.id = store_id and s.status = 'active'
    )
    and exists (
      select 1 from public.products p
      where p.id = product_id
        and p.store_id = store_id
        and p.status = 'active'
    )
  );

drop policy if exists product_reviews_own_update_pending on public.product_reviews;
create policy product_reviews_own_update_pending
  on public.product_reviews for update to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (
    user_id = auth.uid()
    and status = 'pending'
  );

drop policy if exists product_reviews_admin_select on public.product_reviews;
create policy product_reviews_admin_select
  on public.product_reviews for select
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

drop policy if exists product_reviews_admin_update on public.product_reviews;
create policy product_reviews_admin_update
  on public.product_reviews for update
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

drop policy if exists product_reviews_admin_delete on public.product_reviews;
create policy product_reviews_admin_delete
  on public.product_reviews for delete
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );
