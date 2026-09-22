-- Store-wide default for low-stock alerts (admin Settings → General).
alter table public.store_settings
  add column if not exists inventory_low_stock_threshold integer not null default 5;

alter table public.store_settings
  drop constraint if exists store_settings_inventory_low_stock_threshold_range;

alter table public.store_settings
  add constraint store_settings_inventory_low_stock_threshold_range
  check (inventory_low_stock_threshold >= 0 and inventory_low_stock_threshold <= 1000000);

comment on column public.store_settings.inventory_low_stock_threshold is
  'Default low-stock alert level for product variants; can be applied to all inventory rows from General settings.';
