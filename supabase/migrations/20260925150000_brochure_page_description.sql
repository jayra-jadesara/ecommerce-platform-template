-- Storefront /brochure intro copy (Content → Brochures → settings).

alter table public.store_settings
  add column if not exists brochure_page_description text;

alter table public.store_settings
  drop constraint if exists store_settings_brochure_page_description_len;

alter table public.store_settings
  add constraint store_settings_brochure_page_description_len
  check (
    brochure_page_description is null
    or char_length(brochure_page_description) <= 320
  );

comment on column public.store_settings.brochure_page_description is
  'Intro text under the Brochure heading on /brochure. Empty uses the brand default.';
