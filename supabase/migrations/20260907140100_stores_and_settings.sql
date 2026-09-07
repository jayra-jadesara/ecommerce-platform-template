-- Store configuration, branding, theme, animation, SEO, shipping.
-- Multi-tenant ready via store_id; each production client typically uses its own project.

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  legal_name text,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'suspended', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint stores_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index stores_slug_uidx on public.stores (slug);
create index stores_status_idx on public.stores (status);

create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.store_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  contact_email text,
  contact_phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text,
  currency text not null default 'INR',
  timezone text not null default 'UTC',
  business_registration_number text,
  tax_id text,
  checkout_guest_allowed boolean not null default true,
  checkout_require_phone boolean not null default false,
  registration_enabled boolean not null default true,
  registration_require_email_verification boolean not null default true,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.store_branding (
  store_id uuid primary key references public.stores (id) on delete cascade,
  brand_name text not null,
  tagline text,
  logo_path text,
  logo_dark_path text,
  favicon_path text,
  social_sharing_image_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger store_branding_set_updated_at
  before update on public.store_branding
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Theme: semantic colors only — no arbitrary CSS/JS.

create table public.store_theme_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  default_mode text not null default 'light'
    check (default_mode in ('light', 'dark', 'system')),
  enabled_modes text[] not null default array['light', 'dark', 'system']::text[],
  allow_user_toggle boolean not null default true,
  -- light palette
  light_primary text not null,
  light_secondary text not null,
  light_accent text not null,
  light_background text not null,
  light_foreground text not null,
  light_surface text not null,
  light_card text not null,
  light_border text not null,
  light_muted text not null,
  light_success text not null,
  light_warning text not null,
  light_error text not null,
  -- dark palette
  dark_primary text not null,
  dark_secondary text not null,
  dark_accent text not null,
  dark_background text not null,
  dark_foreground text not null,
  dark_surface text not null,
  dark_card text not null,
  dark_border text not null,
  dark_muted text not null,
  dark_success text not null,
  dark_warning text not null,
  dark_error text not null,
  font_sans text,
  font_mono text,
  font_display text,
  border_radius text not null default '8px',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_theme_enabled_modes_nonempty check (cardinality(enabled_modes) > 0),
  constraint store_theme_default_in_enabled check (default_mode = any (enabled_modes))
);

create trigger store_theme_settings_set_updated_at
  before update on public.store_theme_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Animation presets are allow-listed in application code.

create table public.store_animation_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  enabled boolean not null default true,
  preset text not null default 'fade-up'
    check (preset in ('fade', 'fade-up', 'fade-down', 'slide-up', 'slide-down', 'scale', 'none')),
  intensity text not null default 'medium'
    check (intensity in ('subtle', 'medium', 'strong')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger store_animation_settings_set_updated_at
  before update on public.store_animation_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.store_seo_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  site_title text not null,
  meta_description text,
  keywords text[],
  canonical_url text,
  og_title text,
  og_description text,
  og_image_path text,
  robots_index boolean not null default true,
  robots_follow boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger store_seo_settings_set_updated_at
  before update on public.store_seo_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.shipping_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  enabled boolean not null default true,
  method text not null default 'flat_rate'
    check (method in ('flat_rate', 'free', 'percentage', 'zone')),
  free_shipping_threshold numeric(12, 2),
  default_shipping_fee numeric(12, 2) not null default 0
    check (default_shipping_fee >= 0),
  percentage_rate numeric(5, 2)
    check (percentage_rate is null or percentage_rate >= 0),
  estimated_delivery_min_days integer
    check (estimated_delivery_min_days is null or estimated_delivery_min_days >= 0),
  estimated_delivery_max_days integer
    check (estimated_delivery_max_days is null or estimated_delivery_max_days >= 0),
  estimated_delivery_label text,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shipping_estimate_range_valid check (
    estimated_delivery_min_days is null
    or estimated_delivery_max_days is null
    or estimated_delivery_max_days >= estimated_delivery_min_days
  ),
  constraint shipping_free_threshold_nonneg check (
    free_shipping_threshold is null or free_shipping_threshold >= 0
  )
);

create trigger shipping_settings_set_updated_at
  before update on public.shipping_settings
  for each row execute function public.set_updated_at();
