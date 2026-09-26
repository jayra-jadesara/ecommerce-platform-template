-- Customer password/delete permissions + storefront login duration setting.

INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, p.permission
FROM public.roles r
CROSS JOIN (
  VALUES
    ('customers.password'),
    ('customers.delete')
) AS p(permission)
WHERE r.code = 'ADMIN'
  AND r.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, 'customers.password'
FROM public.roles r
WHERE r.code IN ('SUPPORT', 'ORDER_MANAGER')
  AND r.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS customer_session_max_hours integer NULL
    CHECK (
      customer_session_max_hours IS NULL
      OR (customer_session_max_hours >= 1 AND customer_session_max_hours <= 8760)
    );

COMMENT ON COLUMN public.store_settings.customer_session_max_hours IS
  'Max hours since storefront login before shopper session is rejected. NULL = never (JWT only).';
