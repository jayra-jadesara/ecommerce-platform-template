-- Store-wide default for whether new/all variants count stock.
alter table public.store_settings
  add column if not exists inventory_count_stock boolean not null default true;

comment on column public.store_settings.inventory_count_stock is
  'When true, product variants count stock (track_inventory). Applied store-wide from Inventory admin.';
