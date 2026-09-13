-- Fulfillment mode (auto days vs courier) + structured return policy.

alter table public.shipping_settings
  add column if not exists fulfillment_mode text not null default 'auto_days';

alter table public.shipping_settings
  drop constraint if exists shipping_settings_fulfillment_mode_check;

alter table public.shipping_settings
  add constraint shipping_settings_fulfillment_mode_check
  check (fulfillment_mode in ('auto_days', 'courier_api'));

alter table public.shipping_settings
  add column if not exists return_policy text not null default 'no_return_refund';

alter table public.shipping_settings
  drop constraint if exists shipping_settings_return_policy_check;

alter table public.shipping_settings
  add constraint shipping_settings_return_policy_check
  check (return_policy in ('no_return_refund', 'no_replace', 'replace_only'));

comment on column public.shipping_settings.fulfillment_mode is
  'auto_days = auto Delivered after N days; courier_api = tracking/courier based.';

comment on column public.shipping_settings.return_policy is
  'Default store return policy shown on the storefront.';

-- Backfill auto mode when days already configured.
update public.shipping_settings
set fulfillment_mode = 'auto_days'
where auto_deliver_after_days is not null
  and fulfillment_mode is distinct from 'courier_api';

alter table public.products
  add column if not exists return_policy text;

alter table public.products
  drop constraint if exists products_return_policy_check;

alter table public.products
  add constraint products_return_policy_check
  check (
    return_policy is null
    or return_policy in ('no_return_refund', 'no_replace', 'replace_only')
  );

-- Migrate boolean → policy; null means use store default.
update public.products
set return_policy = case
  when returns_allowed is true then 'no_replace'
  else 'no_return_refund'
end
where return_policy is null;

alter table public.order_items
  add column if not exists return_policy text;

alter table public.order_items
  drop constraint if exists order_items_return_policy_check;

alter table public.order_items
  add constraint order_items_return_policy_check
  check (
    return_policy is null
    or return_policy in ('no_return_refund', 'no_replace', 'replace_only')
  );

update public.order_items
set return_policy = case
  when returns_allowed is true then 'no_replace'
  else 'no_return_refund'
end
where return_policy is null;
