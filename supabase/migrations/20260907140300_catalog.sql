-- Catalog: categories, products, variants, images metadata, inventory.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  parent_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_parent_not_self check (parent_id is distinct from id)
);

create unique index categories_store_slug_uidx on public.categories (store_id, slug);
create index categories_store_id_idx on public.categories (store_id);
create index categories_parent_id_idx on public.categories (parent_id);
create index categories_is_active_idx on public.categories (is_active);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null,
  short_description text,
  description text,
  brand text,
  ingredients text,
  usage_instructions text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  featured boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index products_store_slug_uidx on public.products (store_id, slug);
create index products_store_id_idx on public.products (store_id);
create index products_category_id_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create index products_featured_idx on public.products (featured) where featured = true;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  sku text not null,
  price numeric(12, 2) not null check (price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  cost_price numeric(12, 2) check (cost_price is null or cost_price >= 0),
  weight numeric(12, 3) check (weight is null or weight >= 0),
  unit text,
  track_inventory boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index product_variants_sku_uidx on public.product_variants (sku);
create index product_variants_product_id_idx on public.product_variants (product_id);
create index product_variants_is_active_idx on public.product_variants (is_active);

create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Image binaries live in Storage; DB holds metadata/paths only.

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  storage_path text not null,
  public_url text,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint product_images_path_nonempty check (length(trim(storage_path)) > 0)
);

create index product_images_product_id_idx on public.product_images (product_id);
create index product_images_variant_id_idx on public.product_images (variant_id);

create unique index product_images_one_primary_uidx
  on public.product_images (product_id)
  where is_primary = true;

-- ---------------------------------------------------------------------------

create table public.inventory (
  variant_id uuid primary key references public.product_variants (id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_reserved_lte_quantity check (reserved_quantity <= quantity)
);

create trigger inventory_set_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

-- Ensure inventory row exists when a variant is created.
create or replace function public.create_inventory_for_variant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.inventory (variant_id)
  values (new.id)
  on conflict (variant_id) do nothing;
  return new;
end;
$$;

create trigger product_variants_create_inventory
  after insert on public.product_variants
  for each row execute function public.create_inventory_for_variant();
