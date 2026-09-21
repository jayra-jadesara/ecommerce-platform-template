-- Auto-approve customer reviews (default off).

alter table public.store_settings
  add column if not exists reviews_auto_approve boolean not null default false;

comment on column public.store_settings.reviews_auto_approve is
  'When true, new product reviews are approved immediately and show on the storefront.';

-- Allow insert row to become approved via BEFORE INSERT trigger (WITH CHECK runs after).
drop policy if exists product_reviews_own_insert on public.product_reviews;
create policy product_reviews_own_insert
  on public.product_reviews for insert to authenticated
  with check (
    user_id = auth.uid()
    and status in ('pending', 'approved')
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

create or replace function public.product_reviews_apply_auto_approve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending'
     and exists (
       select 1
       from public.store_settings s
       where s.store_id = new.store_id
         and s.reviews_auto_approve = true
     ) then
    new.status := 'approved';
  end if;
  return new;
end;
$$;

drop trigger if exists product_reviews_auto_approve_bi on public.product_reviews;
create trigger product_reviews_auto_approve_bi
  before insert on public.product_reviews
  for each row execute function public.product_reviews_apply_auto_approve();
