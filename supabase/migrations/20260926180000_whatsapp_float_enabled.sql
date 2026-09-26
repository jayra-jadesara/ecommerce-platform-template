-- Floating WhatsApp chat button on storefront (default off).

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS whatsapp_float_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.store_settings.whatsapp_float_enabled IS
  'When true and social_whatsapp is set, show a fixed floating WhatsApp button on the storefront.';
