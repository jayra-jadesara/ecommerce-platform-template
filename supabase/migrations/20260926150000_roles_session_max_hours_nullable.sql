-- Allow NULL session_max_hours = no app-layer limit ("Never" in Teams UI).
-- Supabase JWT expiry still applies project-wide.

ALTER TABLE public.roles
  ALTER COLUMN session_max_hours DROP NOT NULL;

ALTER TABLE public.roles
  DROP CONSTRAINT IF EXISTS roles_session_max_hours_check;

ALTER TABLE public.roles
  ADD CONSTRAINT roles_session_max_hours_check
  CHECK (
    session_max_hours IS NULL
    OR (session_max_hours >= 1 AND session_max_hours <= 8760)
  );

COMMENT ON COLUMN public.roles.session_max_hours IS
  'Max hours since login before admin session is rejected (strictest role wins). NULL = no app limit.';
