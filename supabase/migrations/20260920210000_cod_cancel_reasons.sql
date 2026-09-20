-- COD cancel reasons: admin presets on shipping_settings + persisted customer reason on orders.

alter table public.shipping_settings
  add column if not exists cancel_reason_options jsonb not null
    default '["Changed mind","Ordered by mistake","Wrong address / details","Found better price","Delivery too slow","Other"]'::jsonb;

comment on column public.shipping_settings.cancel_reason_options is
  'Admin-configured reason labels shown in the customer COD cancel dialog.';

alter table public.orders
  add column if not exists cancel_reason_code text;

alter table public.orders
  add column if not exists cancel_reason text;

comment on column public.orders.cancel_reason_code is
  'Preset reason label from store cancel options; free-text details live in cancel_reason when Other.';
comment on column public.orders.cancel_reason is
  'Customer-facing cancel reason text (preset label or Other free text).';
