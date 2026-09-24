-- Backfill permissions added to the app catalog after the original
-- role_permissions seed (20260924120000). ON CONFLICT DO NOTHING so
-- intentional Super Admin removals on editable roles stay removed.

-- Dashboard cards (legacy roles: page access without card keys)
insert into public.role_permissions (role_id, permission)
select r.id, p.permission
from public.roles r
cross join (
  values
    ('dash_overview.view'),
    ('dash_charts.view'),
    ('dash_attention.view'),
    ('dash_recent.view')
) as p(permission)
where r.code in (
  'SUPER_ADMIN',
  'ADMIN',
  'EDITOR',
  'ORDER_MANAGER',
  'MARKETING',
  'SUPPORT',
  'READER'
)
on conflict do nothing;

-- Store layout + hosting (split from settings.view for custom roles)
insert into public.role_permissions (role_id, permission)
select r.id, p.permission
from public.roles r
cross join (
  values
    ('platform.view'),
    ('settings_header.view'),
    ('settings_header.update'),
    ('settings_footer.view'),
    ('settings_footer.update')
) as p(permission)
where r.code in ('SUPER_ADMIN', 'ADMIN')
on conflict do nothing;

insert into public.role_permissions (role_id, permission)
select r.id, p.permission
from public.roles r
cross join (
  values
    ('platform.view'),
    ('settings_header.view'),
    ('settings_footer.view')
) as p(permission)
where r.code = 'READER'
on conflict do nothing;
