-- Product page: configurable detail sections, FAQ templates, per-product banners/FAQ.
-- Contact page banner on store_settings. About/Career banners live in CMS section JSON.

-- Seeded section ids (stable): description | how_to_use | ingredients

alter table public.store_settings
  add column if not exists product_detail_sections jsonb not null default '[
    {"id":"description","heading":"Description","sortOrder":0,"active":true},
    {"id":"how_to_use","heading":"How to use","sortOrder":1,"active":true},
    {"id":"ingredients","heading":"Ingredients","sortOrder":2,"active":true}
  ]'::jsonb;

alter table public.store_settings
  add column if not exists product_faq_heading text not null default 'FAQs';

alter table public.store_settings
  drop constraint if exists store_settings_product_faq_heading_len;

alter table public.store_settings
  add constraint store_settings_product_faq_heading_len
    check (char_length(product_faq_heading) between 1 and 80);

alter table public.store_settings
  add column if not exists product_faq_questions jsonb not null default '[]'::jsonb;

alter table public.store_settings
  add column if not exists contact_banner_enabled boolean not null default false;

alter table public.store_settings
  add column if not exists contact_banner_image_path text;

comment on column public.store_settings.product_detail_sections is
  'Ordered PDP collapse headings [{id, heading, sortOrder, active}].';
comment on column public.store_settings.product_faq_heading is
  'Heading above product FAQs on the storefront PDP.';
comment on column public.store_settings.product_faq_questions is
  'Store-wide FAQ question templates [{id, question, sortOrder, active}].';
comment on column public.store_settings.contact_banner_enabled is
  'When true and image path set, show hero banner on Contact page.';
comment on column public.store_settings.contact_banner_image_path is
  'Storage path for Contact page hero banner image.';

alter table public.products
  add column if not exists banner_enabled boolean not null default false;

alter table public.products
  add column if not exists banner_image_path text;

alter table public.products
  add column if not exists faq_enabled boolean not null default false;

alter table public.products
  add column if not exists faq_answers jsonb not null default '{}'::jsonb;

alter table public.products
  add column if not exists section_content jsonb not null default '{}'::jsonb;

comment on column public.products.banner_enabled is
  'When true and banner_image_path set, show PDP hero banner.';
comment on column public.products.banner_image_path is
  'Storage path for product page hero banner.';
comment on column public.products.faq_enabled is
  'When true, show product FAQs above Related products (if answers exist).';
comment on column public.products.faq_answers is
  'Map of FAQ question id → answer text.';
comment on column public.products.section_content is
  'Map of detail section id → body text for PDP collapses.';

-- Backfill section_content from legacy text columns (only when empty).
update public.products
set section_content = jsonb_strip_nulls(
  jsonb_build_object(
    'description', nullif(trim(coalesce(description, '')), ''),
    'how_to_use', nullif(trim(coalesce(usage_instructions, '')), ''),
    'ingredients', nullif(trim(coalesce(ingredients, '')), '')
  )
)
where section_content = '{}'::jsonb
  and (
    nullif(trim(coalesce(description, '')), '') is not null
    or nullif(trim(coalesce(usage_instructions, '')), '') is not null
    or nullif(trim(coalesce(ingredients, '')), '') is not null
  );
