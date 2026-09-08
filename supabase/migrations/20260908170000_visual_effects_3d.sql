-- Phase 16: store-wide 3D / visual effects settings + optional product model path.

create table if not exists public.store_visual_effects_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  enabled boolean not null default false,
  hero_enabled boolean not null default false,
  product_enabled boolean not null default false,
  quality text not null default 'MEDIUM'
    check (quality in ('LOW', 'MEDIUM', 'HIGH')),
  hero_preset text not null default 'NONE'
    check (hero_preset in (
      'NONE',
      'FLOATING_SHAPES',
      'PRODUCT_ORBIT',
      'ABSTRACT_PARTICLES',
      'SOFT_GEOMETRY'
    )),
  mobile_enabled boolean not null default false,
  respect_reduced_motion boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger store_visual_effects_settings_set_updated_at
  before update on public.store_visual_effects_settings
  for each row execute function public.set_updated_at();

alter table public.store_visual_effects_settings enable row level security;

create policy store_visual_effects_public_read
  on public.store_visual_effects_settings for select
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and (s.status = 'active' or public.is_active_admin())
    )
  );

create policy store_visual_effects_admin_write
  on public.store_visual_effects_settings for all
  using (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  )
  with check (
    public.has_admin_role(array['SUPER_ADMIN', 'ADMIN', 'EDITOR'])
    and public.is_store_admin(store_id)
  );

-- Optional trusted 3D model storage path (GLB/GLTF) for products — not required.
alter table public.products
  add column if not exists model_path text;

comment on column public.products.model_path is
  'Optional store-scoped GLB/GLTF storage path. Never an arbitrary remote URL.';

-- Allow trusted GLB/GLTF on the public products bucket (store-scoped paths only in app).
update storage.buckets
set
  file_size_limit = greatest(coalesce(file_size_limit, 0), 26214400),
  allowed_mime_types = (
    select array_agg(distinct mime)
    from unnest(
      coalesce(allowed_mime_types, array[]::text[])
      || array[
        'model/gltf-binary',
        'model/gltf+json',
        'application/octet-stream'
      ]
    ) as mime
  )
where id = 'products';
