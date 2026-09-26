-- Per-role maximum login/session duration (hours). Enforced in app session layer.
-- Supabase JWT lifetime stays project-global; this is an earlier soft logout.

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS session_max_hours integer NOT NULL DEFAULT 168
    CHECK (session_max_hours >= 1 AND session_max_hours <= 8760);

COMMENT ON COLUMN public.roles.session_max_hours IS
  'Max hours since login before admin session is rejected (strictest role wins).';

UPDATE public.roles SET session_max_hours = 24 WHERE code = 'SUPER_ADMIN';
UPDATE public.roles SET session_max_hours = 12 WHERE code = 'ADMIN';
UPDATE public.roles SET session_max_hours = 8 WHERE code IN (
  'EDITOR',
  'MARKETING',
  'ORDER_MANAGER',
  'SUPPORT'
);
UPDATE public.roles SET session_max_hours = 168 WHERE code = 'READER';
