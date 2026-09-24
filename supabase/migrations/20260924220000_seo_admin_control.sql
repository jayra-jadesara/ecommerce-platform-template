-- Google & SEO: DB-driven verification, title template, Twitter, per-page SEO copy.
-- No storefront SEO strings should be hardcoded when these columns are set.

alter table public.store_seo_settings
  add column if not exists google_site_verification text,
  add column if not exists title_template text,
  add column if not exists twitter_handle text,
  add column if not exists page_seo jsonb not null default '{}'::jsonb;

comment on column public.store_seo_settings.google_site_verification is
  'Google Search Console content= value for meta name=google-site-verification';
comment on column public.store_seo_settings.title_template is
  'Next.js title template, e.g. %s | Store Name. Empty = auto from site_title.';
comment on column public.store_seo_settings.twitter_handle is
  'Optional @handle for Twitter card site field';
comment on column public.store_seo_settings.page_seo is
  'Per-page SEO { about|contact|career|products|blog|privacy|terms|disclaimer: { title, description } }';
