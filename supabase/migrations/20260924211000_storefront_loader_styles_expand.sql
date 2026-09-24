-- Allow the 10 storefront loader styles (was only the original 5).
alter table public.store_settings
  drop constraint if exists store_settings_storefront_loader_style_check;

alter table public.store_settings
  add constraint store_settings_storefront_loader_style_check
    check (
      storefront_loader_style in (
        'spinner',
        'ring',
        'dots',
        'pulse',
        'bars',
        'dual',
        'orbit',
        'wave',
        'bloom',
        'dash'
      )
    );

comment on column public.store_settings.storefront_loader_style is
  'Storefront LoadingState visual: spinner|ring|dots|pulse|bars|dual|orbit|wave|bloom|dash';
