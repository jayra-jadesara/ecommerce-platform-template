import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminPath } from "@/config/admin-route";
import {
  hasPermission as roleHasPermission,
  permissionsForRoles,
  type Permission,
} from "@/features/auth/permissions";
import {
  clearImpersonationCookie,
  readImpersonationCookie,
} from "@/features/auth/impersonation";
import { measureServerOperation } from "@/lib/perf/measure-server";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { AdminRoleCode, Tables } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email: string | null;
};

export type AdminImpersonationInfo = {
  actorUserId: string;
  actorEmail: string | null;
  targetUserId: string;
  targetEmail: string | null;
  targetRoles: AdminRoleCode[];
};

export type AdminContext = {
  user: AuthUser;
  admin: Tables<"admin_users">;
  roles: AdminRoleCode[];
  permissions: Set<Permission>;
  /** Set when Super Admin is viewing the admin UI as another staff member. */
  impersonation: AdminImpersonationInfo | null;
};

/** Shared auth.getUser() for the current request (cookie-bound). */
const getAuthSessionUser = cache(async (): Promise<User | null> => {
  return measureServerOperation("auth.getUser", async () => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  });
});

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const user = await getAuthSessionUser();
  return user ? toAuthUser(user) : null;
});

export async function requireUser(loginPath = "/login"): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath);
  return user;
}

async function loadAdminContextForUserId(
  userId: string,
  emailHint?: string | null,
): Promise<Omit<AdminContext, "impersonation"> | null> {
  const supabase = await createSupabaseServerClient();

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminError || !admin || !admin.is_active) return null;

  const { data: roleLinks, error: linksError } = await supabase
    .from("admin_user_roles")
    .select("role_id")
    .eq("user_id", userId);

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
    user: { id: userId, email: emailHint ?? null },
    admin,
    roles,
    permissions: permissionsForRoles(roles),
  };
}

/**
 * Real signed-in admin (ignores impersonation overlay).
 * Use for start/stop impersonation and staff delete guards.
 */
export const getActorAdmin = cache(async (): Promise<AdminContext | null> => {
  return measureServerOperation("auth.getActorAdmin", async () => {
    const authUser = await getAuthSessionUser();
    if (!authUser) return null;
    const loaded = await loadAdminContextForUserId(
      authUser.id,
      authUser.email ?? null,
    );
    if (!loaded) return null;
    return { ...loaded, impersonation: null };
  });
});

export const getCurrentAdmin = cache(async (): Promise<AdminContext | null> => {
  return measureServerOperation("auth.getCurrentAdmin", async () => {
    const authUser = await getAuthSessionUser();
    if (!authUser) return null;

    const actor = await loadAdminContextForUserId(
      authUser.id,
      authUser.email ?? null,
    );
    if (!actor) return null;

    const overlay = await readImpersonationCookie();
    if (
      overlay &&
      overlay.actorUserId === authUser.id &&
      actor.roles.includes("SUPER_ADMIN") &&
      overlay.targetUserId !== authUser.id
    ) {
      const target = await loadAdminContextForUserId(overlay.targetUserId);
      if (target) {
        let targetEmail = target.user.email;
        try {
          const service = createSupabaseServiceClient();
          const { data } = await service.auth.admin.getUserById(target.user.id);
          targetEmail = data.user?.email ?? targetEmail;
        } catch {
          // Banner can fall back to role label.
        }
        return {
          ...target,
          user: { ...target.user, email: targetEmail },
          impersonation: {
            actorUserId: actor.user.id,
            actorEmail: actor.user.email,
            targetUserId: target.user.id,
            targetEmail,
            targetRoles: target.roles,
          },
        };
      }
      await clearImpersonationCookie();
    } else if (overlay && overlay.actorUserId !== authUser.id) {
      await clearImpersonationCookie();
    }

    return { ...actor, impersonation: null };
  });
});

export async function requireAdmin(
  permission?: Permission,
): Promise<AdminContext> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    const user = await getCurrentUser();
    if (!user) {
      redirect(getAdminPath("/login"));
    }
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
