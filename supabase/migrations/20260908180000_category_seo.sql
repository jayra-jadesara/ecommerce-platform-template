-- Phase 17: optional SEO fields on categories (reuse categories table — no duplicate SEO system).

alter table public.categories
  add column if not exists seo_title text,
  add column if not exists seo_description text;

comment on column public.categories.seo_title is
  'Optional search title override. Falls back to category name.';
comment on column public.categories.seo_description is
  'Optional search description. Falls back to category description / store SEO.';
