-- Multi-select checkout methods: Razorpay + Cash on Delivery.
-- provider column kept in sync for older readers (razorpay | none).

alter table public.payment_settings
  add column if not exists razorpay_enabled boolean not null default false;

alter table public.payment_settings
  add column if not exists cod_enabled boolean not null default false;

update public.payment_settings
set razorpay_enabled = true
where provider = 'razorpay'
  and razorpay_enabled = false;

-- Normalize legacy "other" to none for synced provider.
update public.payment_settings
set provider = 'none'
where provider = 'other';

comment on column public.payment_settings.razorpay_enabled is
  'When true, customers can pay online with Razorpay at checkout.';

comment on column public.payment_settings.cod_enabled is
  'When true, customers can place Cash on Delivery orders at checkout.';
