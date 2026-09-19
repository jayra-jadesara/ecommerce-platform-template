-- Allow homepage “Other information” sections (pulls Content → About blocks).

alter table public.page_sections
  drop constraint if exists page_sections_section_type_check;

alter table public.page_sections
  add constraint page_sections_section_type_check
  check (section_type in (
    'hero',
    'text',
    'image',
    'banner',
    'products',
    'categories',
    'testimonials',
    'faq',
    'cta',
    'about',
    'other_information',
    'career',
    'features',
    'statistics',
    'text_image',
    'newsletter',
    'custom'
  ));
