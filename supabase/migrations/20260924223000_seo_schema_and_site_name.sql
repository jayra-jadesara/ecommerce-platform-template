-- Google & SEO: site name + schema/sitemap controls (admin-managed JSON).

alter table public.store_seo_settings
  add column if not exists site_name text,
  add column if not exists schema_settings jsonb not null default '{}'::jsonb;

comment on column public.store_seo_settings.site_name is
  'Google site name / Open Graph siteName. Empty = use site_title.';
comment on column public.store_seo_settings.schema_settings is
  'JSON: LocalBusiness/Organization/SearchAction toggles, businessType, priceRange, geo, sitemap section flags';
