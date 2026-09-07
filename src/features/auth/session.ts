import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminPath } from "@/config/admin-route";
import {
  hasPermission as roleHasPermission,
  permissionsForRoles,
  type Permission,
} from "@/features/auth/permissions";
import type { AdminRoleCode, Tables } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email: string | null;
};

export type AdminContext = {
  user: AuthUser;
  admin: Tables<"admin_users">;
  roles: AdminRoleCode[];
  permissions: Set<Permission>;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return toAuthUser(data.user);
}

export async function requireUser(loginPath = "/login"): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath);
  return user;
}

export async function getCurrentAdmin(): Promise<AdminContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const user = toAuthUser(authData.user);

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin || !admin.is_active) return null;

  const { data: roleLinks, error: linksError } = await supabase
    .from("admin_user_roles")
    .select("role_id")
    .eq("user_id", user.id);

  if (linksError || !roleLinks?.length) return null;

  const roleIds = roleLinks.map((row) => row.role_id);
  const { data: roleRows, error: rolesError } = await supabase
    .from("roles")
    .select("code")
    .in("id", roleIds);

  if (rolesError || !roleRows?.length) return null;

  const roles = roleRows
    .map((row) => row.code)
    .filter((code): code is AdminRoleCode => Boolean(code));

  if (roles.length === 0) return null;

  return {
    user,
    admin,
    roles,
    permissions: permissionsForRoles(roles),
  };
}

export async function requireAdmin(
  permission?: Permission,
): Promise<AdminContext> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(getAdminPath("/login"));
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    // Authenticated but not an active admin (customer or inactive).
    redirect(getAdminPath("/unauthorized"));
  }
  if (permission && !admin.permissions.has(permission)) {
    redirect(getAdminPath("/unauthorized"));
  }
  return admin;
}

export async function requirePermission(
  permission: Permission,
): Promise<AdminContext> {
  return requireAdmin(permission);
}

export function hasRole(
  admin: AdminContext,
  role: AdminRoleCode | AdminRoleCode[],
): boolean {
  const needed = Array.isArray(role) ? role : [role];
  return needed.some((r) => admin.roles.includes(r));
}

export function hasPermission(
  admin: AdminContext,
  permission: Permission,
): boolean {
  return roleHasPermission(admin.roles, permission);
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
  };
}
