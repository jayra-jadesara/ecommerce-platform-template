-- Custom order number prefix per store (e.g. SONET-ORD → SONET-ORD-MU9GO741-A1B2C3).

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS order_number_prefix text NOT NULL DEFAULT 'ORD'
    CHECK (
      char_length(trim(order_number_prefix)) >= 1
      AND char_length(trim(order_number_prefix)) <= 24
    );

COMMENT ON COLUMN public.store_settings.order_number_prefix IS
  'Prefix for new order numbers (e.g. SONET-ORD). Existing orders keep their numbers.';
