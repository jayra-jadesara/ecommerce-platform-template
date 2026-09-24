-- Super Admin may manage role_permissions for system roles (except app blocks SUPER_ADMIN).
-- Custom-role row writes on public.roles stay limited to is_system = false.

drop policy if exists role_permissions_super_write on public.role_permissions;

create policy role_permissions_super_write on public.role_permissions
  for all to authenticated
  using (public.has_admin_role(array['SUPER_ADMIN']))
  with check (public.has_admin_role(array['SUPER_ADMIN']));
