-- Phase 9: shopping carts (guest + customer) and customer wishlists.
-- Guest cart access is mediated by server-side service role + signed cookie;
-- no broad anon RLS on private cart data.

-- ---------------------------------------------------------------------------
-- carts
-- ---------------------------------------------------------------------------
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  guest_token uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_owner_xor check (
    (user_id is not null and guest_token is null)
    or (user_id is null and guest_token is not null)
  )
);

create unique index if not exists carts_store_user_uidx
  on public.carts (store_id, user_id)
  where user_id is not null;

create unique index if not exists carts_store_guest_token_uidx
  on public.carts (store_id, guest_token)
  where guest_token is not null;

create index if not exists carts_store_id_idx on public.carts (store_id);
create index if not exists carts_expires_at_idx on public.carts (expires_at)
  where expires_at is not null;

drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

comment on table public.carts is
  'Store-scoped shopping carts. Customer carts use user_id; guest carts use guest_token.';
comment on column public.carts.guest_token is
  'Server-generated UUID for guest carts. Never trust client-supplied user IDs.';
comment on column public.carts.expires_at is
  'Optional guest cart expiry. Soft check only; no aggressive background deletion.';

-- ---------------------------------------------------------------------------
-- cart_items
-- ---------------------------------------------------------------------------
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_items_quantity_positive check (quantity > 0),
  constraint cart_items_quantity_max check (quantity <= 99),
  constraint cart_items_cart_variant_uidx unique (cart_id, variant_id)
);

create index if not exists cart_items_cart_id_idx on public.cart_items (cart_id);
create index if not exists cart_items_product_id_idx on public.cart_items (product_id);
create index if not exists cart_items_variant_id_idx on public.cart_items (variant_id);

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

comment on table public.cart_items is
  'Cart line items. Unit price is always resolved from product_variants at read time.';

-- ---------------------------------------------------------------------------
-- wishlists
-- ---------------------------------------------------------------------------
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wishlists_store_user_uidx unique (store_id, user_id)
);

create index if not exists wishlists_user_id_idx on public.wishlists (user_id);

drop trigger if exists wishlists_set_updated_at on public.wishlists;
create trigger wishlists_set_updated_at
  before update on public.wishlists
  for each row execute function public.set_updated_at();

comment on table public.wishlists is
  'Customer-only wishlists. Guest wishlist is not supported.';

-- ---------------------------------------------------------------------------
-- wishlist_items
-- ---------------------------------------------------------------------------
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists wishlist_items_wishlist_variant_uidx
  on public.wishlist_items (wishlist_id, variant_id)
  where variant_id is not null;

create unique index if not exists wishlist_items_wishlist_product_null_variant_uidx
  on public.wishlist_items (wishlist_id, product_id)
  where variant_id is null;

create index if not exists wishlist_items_wishlist_id_idx
  on public.wishlist_items (wishlist_id);

comment on table public.wishlist_items is
  'Wishlist lines. Duplicates prevented per wishlist+variant (or product when variant is null).';

-- ---------------------------------------------------------------------------
-- RLS — authenticated own-data only; no anon policies for carts/wishlists
-- ---------------------------------------------------------------------------
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;

drop policy if exists carts_select_own on public.carts;
create policy carts_select_own
  on public.carts for select to authenticated
  using (user_id = auth.uid());

drop policy if exists carts_insert_own on public.carts;
create policy carts_insert_own
  on public.carts for insert to authenticated
  with check (user_id = auth.uid() and guest_token is null);

drop policy if exists carts_update_own on public.carts;
create policy carts_update_own
  on public.carts for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and guest_token is null);

drop policy if exists carts_delete_own on public.carts;
create policy carts_delete_own
  on public.carts for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists cart_items_select_own on public.cart_items;
create policy cart_items_select_own
  on public.cart_items for select to authenticated
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = auth.uid()
    )
  );

drop policy if exists cart_items_insert_own on public.cart_items;
create policy cart_items_insert_own
  on public.cart_items for insert to authenticated
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = auth.uid()
    )
  );

drop policy if exists cart_items_update_own on public.cart_items;
create policy cart_items_update_own
  on public.cart_items for update to authenticated
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = auth.uid()
    )
  );

drop policy if exists cart_items_delete_own on public.cart_items;
create policy cart_items_delete_own
  on public.cart_items for delete to authenticated
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = auth.uid()
    )
  );

drop policy if exists wishlists_select_own on public.wishlists;
create policy wishlists_select_own
  on public.wishlists for select to authenticated
  using (user_id = auth.uid());

drop policy if exists wishlists_insert_own on public.wishlists;
create policy wishlists_insert_own
  on public.wishlists for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists wishlists_update_own on public.wishlists;
create policy wishlists_update_own
  on public.wishlists for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists wishlists_delete_own on public.wishlists;
create policy wishlists_delete_own
  on public.wishlists for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists wishlist_items_select_own on public.wishlist_items;
create policy wishlist_items_select_own
  on public.wishlist_items for select to authenticated
  using (
    exists (
      select 1 from public.wishlists w
      where w.id = wishlist_id and w.user_id = auth.uid()
    )
  );

drop policy if exists wishlist_items_insert_own on public.wishlist_items;
create policy wishlist_items_insert_own
  on public.wishlist_items for insert to authenticated
  with check (
    exists (
      select 1 from public.wishlists w
      where w.id = wishlist_id and w.user_id = auth.uid()
    )
  );

drop policy if exists wishlist_items_update_own on public.wishlist_items;
create policy wishlist_items_update_own
  on public.wishlist_items for update to authenticated
  using (
    exists (
      select 1 from public.wishlists w
      where w.id = wishlist_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.wishlists w
      where w.id = wishlist_id and w.user_id = auth.uid()
    )
  );

drop policy if exists wishlist_items_delete_own on public.wishlist_items;
create policy wishlist_items_delete_own
  on public.wishlist_items for delete to authenticated
  using (
    exists (
      select 1 from public.wishlists w
      where w.id = wishlist_id and w.user_id = auth.uid()
    )
  );
