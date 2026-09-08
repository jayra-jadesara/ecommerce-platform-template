-- Phase 14: race-safe coupon redemption + lookup index.

create index if not exists coupon_redemptions_coupon_user_idx
  on public.coupon_redemptions (coupon_id, user_id);

/**
 * Atomically redeem a coupon for an order.
 * - Locks the coupon row
 * - Enforces usage_limit / per_user_limit
 * - Idempotent via unique (order_id) on coupon_redemptions
 */
create or replace function public.redeem_coupon_for_order(
  p_order_id uuid,
  p_coupon_id uuid,
  p_user_id uuid,
  p_discount_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_order public.orders%rowtype;
  v_total_uses integer;
  v_user_uses integer;
  v_existing uuid;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;

  select id into v_existing
  from public.coupon_redemptions
  where order_id = p_order_id;

  if v_existing is not null then
    return jsonb_build_object('ok', true, 'already_redeemed', true);
  end if;

  select * into v_coupon
  from public.coupons
  where id = p_coupon_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'coupon_not_found');
  end if;

  if v_coupon.store_id <> v_order.store_id then
    return jsonb_build_object('ok', false, 'error', 'store_mismatch');
  end if;

  if not v_coupon.is_active then
    return jsonb_build_object('ok', false, 'error', 'inactive');
  end if;

  if v_coupon.starts_at is not null and v_coupon.starts_at > timezone('utc', now()) then
    return jsonb_build_object('ok', false, 'error', 'not_started');
  end if;

  if v_coupon.expires_at is not null and v_coupon.expires_at < timezone('utc', now()) then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select count(*)::integer into v_total_uses
  from public.coupon_redemptions
  where coupon_id = p_coupon_id;

  if v_coupon.usage_limit is not null and v_total_uses >= v_coupon.usage_limit then
    return jsonb_build_object('ok', false, 'error', 'usage_limit');
  end if;

  if p_user_id is not null and v_coupon.per_user_limit is not null then
    select count(*)::integer into v_user_uses
    from public.coupon_redemptions
    where coupon_id = p_coupon_id
      and user_id = p_user_id;

    if v_user_uses >= v_coupon.per_user_limit then
      return jsonb_build_object('ok', false, 'error', 'per_user_limit');
    end if;
  end if;

  insert into public.coupon_redemptions (
    coupon_id,
    order_id,
    user_id,
    discount_amount
  ) values (
    p_coupon_id,
    p_order_id,
    p_user_id,
    greatest(0, coalesce(p_discount_amount, 0))
  );

  return jsonb_build_object('ok', true, 'already_redeemed', false);
exception
  when unique_violation then
    return jsonb_build_object('ok', true, 'already_redeemed', true);
end;
$$;

revoke all on function public.redeem_coupon_for_order(uuid, uuid, uuid, numeric) from public;
grant execute on function public.redeem_coupon_for_order(uuid, uuid, uuid, numeric) to service_role;
