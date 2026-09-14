-- Replace request rules: window after delivery, max attempts per line, reason presets.

alter table public.shipping_settings
  add column if not exists replace_window_hours integer not null default 72
    check (replace_window_hours in (24, 48, 72, 168));

alter table public.shipping_settings
  add column if not exists replace_max_attempts integer not null default 1
    check (replace_max_attempts >= 1 and replace_max_attempts <= 5);

alter table public.shipping_settings
  add column if not exists replace_reason_options jsonb not null
    default '["Product damaged","Product opened","Wrong item received","Other"]'::jsonb;

comment on column public.shipping_settings.replace_window_hours is
  'Hours after Delivered during which customers may request a replacement.';
comment on column public.shipping_settings.replace_max_attempts is
  'Max replacement requests allowed per order line item.';
comment on column public.shipping_settings.replace_reason_options is
  'Admin-configured reason labels shown in the customer replace dialog.';

alter table public.order_replace_requests
  add column if not exists reason_code text;

comment on column public.order_replace_requests.reason_code is
  'Preset reason label from store options; free-text details live in reason when Other.';
