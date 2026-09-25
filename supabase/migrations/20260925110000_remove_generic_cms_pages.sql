-- Remove generic CMS pages created via Content → Pages.
-- Keep system pages: home, about, career, privacy, terms, disclaimer.
-- (page_sections cascade on page delete.)

delete from public.pages
where slug not in (
  'home',
  'about',
  'career',
  'privacy',
  'terms',
  'disclaimer'
);
