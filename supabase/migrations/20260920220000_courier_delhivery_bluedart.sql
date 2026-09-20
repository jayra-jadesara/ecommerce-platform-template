-- Courier tracking: Delhivery + Blue Dart fields on orders and shipping_settings.

alter table public.orders
  add column if not exists courier_provider text;

alter table public.orders
  add column if not exists courier_shipment_id text;

alter table public.orders
  add column if not exists tracking_status text;

alter table public.orders
  add column if not exists tracking_synced_at timestamptz;

alter table public.orders
  add column if not exists tracking_payload jsonb;

comment on column public.orders.courier_provider is
  'delhivery | bluedart | manual — structured courier for API sync.';
comment on column public.orders.tracking_status is
  'Normalized carrier status: PENDING, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, EXCEPTION, CANCELLED.';
comment on column public.orders.tracking_payload is
  'Last normalized tracking snapshot (events + raw summary) for UI timeline.';

alter table public.shipping_settings
  add column if not exists courier_default_provider text;

alter table public.shipping_settings
  add column if not exists courier_sandbox boolean not null default true;

alter table public.shipping_settings
  add column if not exists delhivery_api_token text;

alter table public.shipping_settings
  add column if not exists delhivery_client_name text;

alter table public.shipping_settings
  add column if not exists bluedart_login_id text;

alter table public.shipping_settings
  add column if not exists bluedart_licence_key text;

alter table public.shipping_settings
  add column if not exists bluedart_api_key text;

alter table public.shipping_settings
  add column if not exists bluedart_api_secret text;

alter table public.shipping_settings
  add column if not exists bluedart_origin_area text;

comment on column public.shipping_settings.courier_default_provider is
  'Default carrier when fulfillment_mode is courier_api: delhivery | bluedart.';
comment on column public.shipping_settings.courier_sandbox is
  'When true, use Delhivery/Blue Dart staging/sandbox endpoints.';
