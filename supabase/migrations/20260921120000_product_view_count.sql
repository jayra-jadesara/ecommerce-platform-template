-- Product page-view counter for Dashboard "Most viewed" analytics.
alter table public.products
  add column if not exists view_count bigint not null default 0;

comment on column public.products.view_count is
  'Storefront PDP view counter (incremented on product detail load).';

create index if not exists products_store_view_count_idx
  on public.products (store_id, view_count desc);

-- Public-safe increment (storefront can call without service role).
create or replace function public.increment_product_view(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set view_count = view_count + 1,
      updated_at = now()
  where id = p_product_id;
end;
$$;

revoke all on function public.increment_product_view(uuid) from public;
grant execute on function public.increment_product_view(uuid) to anon, authenticated, service_role;
