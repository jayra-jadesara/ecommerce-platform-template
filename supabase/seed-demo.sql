-- OPTIONAL DEMO SEED — DEMO ONLY
-- Do NOT run against a production client database unless you intend to insert sample catalog data.
-- System roles belong in seed.sql (always). This file adds removable sample content only.
--
-- Usage (local / demo projects):
--   Paste into the Supabase SQL editor after migrations + seed.sql + init-store
--
-- Safe to delete: rows with slug prefix `demo-`

do $$
declare
  v_store_id uuid;
  v_category_id uuid;
  v_product_id uuid;
  v_variant_id uuid;
begin
  select id into v_store_id
  from public.stores
  where status = 'active'
  order by created_at asc
  limit 1;

  if v_store_id is null then
    raise notice 'DEMO SEED skipped: no active store. Run npm run init:store first.';
    return;
  end if;

  insert into public.categories (store_id, name, slug, description, is_active, sort_order)
  values (
    v_store_id,
    'Demo Category',
    'demo-category',
    'DEMO ONLY — safe to delete.',
    true,
    0
  )
  on conflict (store_id, slug) do update
    set description = excluded.description
  returning id into v_category_id;

  insert into public.products (
    store_id,
    category_id,
    name,
    slug,
    short_description,
    description,
    status,
    featured
  )
  values (
    v_store_id,
    v_category_id,
    'Demo Product',
    'demo-product',
    'DEMO ONLY sample item.',
    'This product is inserted by seed-demo.sql for local demos. Delete before production.',
    'active',
    true
  )
  on conflict (store_id, slug) do update
    set short_description = excluded.short_description
  returning id into v_product_id;

  select id into v_variant_id
  from public.product_variants
  where product_id = v_product_id
  order by sort_order
  limit 1;

  if v_variant_id is null then
    insert into public.product_variants (
      product_id,
      name,
      sku,
      price,
      compare_at_price,
      is_active,
      sort_order
    )
    values (
      v_product_id,
      'Default',
      'DEMO-SKU-001',
      499.00,
      599.00,
      true,
      0
    )
    returning id into v_variant_id;
  end if;

  insert into public.inventory (variant_id, quantity, low_stock_threshold)
  values (v_variant_id, 25, 5)
  on conflict (variant_id) do nothing;

  raise notice 'DEMO SEED applied for store % (slugs demo-*).', v_store_id;
end $$;
