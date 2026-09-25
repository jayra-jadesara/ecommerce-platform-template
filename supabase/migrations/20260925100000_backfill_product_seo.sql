-- Fill seo_title / seo_description from existing product name & descriptions
-- (no separate SEO form fields — catalog text is the source of truth).

update public.products
set seo_title = left(btrim(name), 60)
where (seo_title is null or btrim(seo_title) = '')
  and name is not null
  and btrim(name) <> '';

update public.products
set seo_description = left(
  btrim(
    coalesce(
      nullif(btrim(short_description), ''),
      nullif(btrim(description), ''),
      name
    )
  ),
  155
)
where (seo_description is null or btrim(seo_description) = '')
  and name is not null
  and btrim(name) <> '';
