import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminPath, getAdminRouteSegment } from "@/config/admin-route";
import {
  hasPermission as roleHasPermission,
  mergePermissionSets,
  permissionsForRoles,
  type Permission,
} from "@/features/auth/permissions";
import { readStaffViewOverlay } from "@/features/auth/impersonation";
import {
  AUTH_LAST_SIGN_IN_HEADER,
  AUTH_USER_EMAIL_HEADER,
  AUTH_USER_ID_HEADER,
} from "@/features/auth/proxy-auth-headers";
import { STAFF_VIEW_HEADER } from "@/features/auth/staff-view-constants";
import { readSessionStartedAtSec } from "@/features/auth/session-started";
import { headers } from "next/headers";
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

type ProxyAuthSnapshot = {
  id: string;
  email: string | null;
  lastSignInAt: string | null;
};

async function readProxyAuthSnapshot(): Promise<ProxyAuthSnapshot | null> {
  const headerList = await headers();
  const id = headerList.get(AUTH_USER_ID_HEADER)?.trim();
  if (!id) return null;
  return {
    id,
    email: headerList.get(AUTH_USER_EMAIL_HEADER),
    lastSignInAt: headerList.get(AUTH_LAST_SIGN_IN_HEADER),
  };
}

/**
 * Shared auth identity for the current request.
 * Prefer proxy-validated headers (one getUser per HTTP request); fall back to
 * supabase.auth.getUser() for actions / unmatched paths.
 */
const getAuthSessionUser = cache(async (): Promise<User | null> => {
  const fromProxy = await readProxyAuthSnapshot();
  if (fromProxy) {
    return {
      id: fromProxy.id,
      email: fromProxy.email ?? undefined,
      last_sign_in_at: fromProxy.lastSignInAt ?? undefined,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "",
    } as User;
  }

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

/**
 * Storefront shopper session TTL from store_settings.customer_session_max_hours.
 * Admins skip this (role session max applies in admin instead).
 */
async function enforceCustomerStorefrontSession(): Promise<boolean> {
  const startedSec = await readSessionStartedAtSec();
  if (startedSec == null) return true;

  const { resolveActiveStoreId } = await import(
    "@/features/admin/settings/store-context"
  );
  const storeId = await resolveActiveStoreId();
  if (!storeId) return true;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("store_settings")
    .select("customer_session_max_hours")
    .eq("store_id", storeId)
    .maybeSingle();

  const maxHours = data?.customer_session_max_hours;
  if (maxHours == null || maxHours <= 0) return true;

  const ageSec = Math.floor(Date.now() / 1000) - startedSec;
  return ageSec <= maxHours * 3600;
}

export async function requireUser(loginPath = "/login"): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath);

  // Storefront session max — skip when the user is also an active admin.
  const admin = await getActorAdmin();
  if (!admin) {
    const withinLimit = await enforceCustomerStorefrontSession();
    if (!withinLimit) {
      redirect(`/api/auth/expire-session?next=${encodeURIComponent(loginPath)}`);
    }
  }

  return user;
}

type RoleRow = {
  id: string;
  code: string | null;
  session_max_hours: number | null;
};

async function loadAdminContextForUserId(
  userId: string,
  emailHint?: string | null,
): Promise<
  | (Omit<AdminContext, "impersonation"> & {
      roleSessionMaxHours: number | null;
    })
  | null
> {
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
    .select("id, code, session_max_hours")
    .in("id", roleIds);

  if (rolesError || !roleRows?.length) return null;

  const typedRoles = roleRows as RoleRow[];

  const roles = typedRoles
    .map((row) => row.code)
    .filter((code): code is AdminRoleCode => Boolean(code));

  if (roles.length === 0) return null;

  const hours = typedRoles
    .map((row) => row.session_max_hours)
    .filter((h): h is number => typeof h === "number" && h > 0);
  const roleSessionMaxHours = hours.length ? Math.min(...hours) : null;

  const { data: permRows } = await supabase
    .from("role_permissions")
    .select("role_id, permission")
    .in("role_id", roleIds);

  const permsByRoleId = new Map<string, string[]>();
  for (const row of permRows ?? []) {
    if (!row.role_id) continue;
    const list = permsByRoleId.get(row.role_id) ?? [];
    list.push(String(row.permission ?? ""));
    permsByRoleId.set(row.role_id, list);
  }

  // Prefer DB grants per role (so Super Admin edits stick). Fall back to the
  // TS system map only when a role has no role_permissions rows yet.
  const permissionBags: Array<Iterable<string>> = [];
  for (const row of typedRoles) {
    const dbList = (permsByRoleId.get(row.id) ?? []).filter(Boolean);
    if (dbList.length > 0) {
      permissionBags.push(dbList);
      continue;
    }
    if (row.code) {
      permissionBags.push(permissionsForRoles([row.code as AdminRoleCode]));
    }
  }
  // SUPER_ADMIN is not editable in-app; always union the full TS catalog so
  // newer permissions (e.g. platform.view) appear even when DB seed is older.
  if (roles.includes("SUPER_ADMIN")) {
    permissionBags.push(permissionsForRoles(["SUPER_ADMIN"]));
  }
  const permissions = mergePermissionSets(...permissionBags);

  return {
    user: { id: userId, email: emailHint ?? null },
    admin,
    roles,
    permissions,
    roleSessionMaxHours,
  };
}

async function isAdminAreaRequest(): Promise<boolean> {
  const headerList = await headers();
  const pathname = headerList.get("x-admin-pathname") ?? "";
  try {
    const base = `/${getAdminRouteSegment()}`;
    return pathname === base || pathname.startsWith(`${base}/`);
  } catch {
    return false;
  }
}

async function enforceRoleSessionMax(
  _authUser: User,
  maxHours: number | null,
): Promise<boolean> {
  if (maxHours == null || maxHours <= 0) return true;

  // Only the login-start cookie is authoritative. Falling back to last_sign_in_at
  // falsely expires long-lived sessions after deploy; proxy seeds the cookie.
  const startedSec = await readSessionStartedAtSec();
  if (startedSec == null) return true;

  const maxAgeSec = maxHours * 3600;
  const ageSec = Math.floor(Date.now() / 1000) - startedSec;
  if (ageSec <= maxAgeSec) return true;

  // Cookie mutation is illegal during RSC — route handler clears the session.
  if (await isAdminAreaRequest()) {
    redirect("/api/auth/expire-session");
  }
  return false;
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
    const ok = await enforceRoleSessionMax(
      authUser,
      loaded.roleSessionMaxHours,
    );
    if (!ok) return null;
    const { roleSessionMaxHours: _h, ...rest } = loaded;
    return { ...rest, impersonation: null };
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

    const ok = await enforceRoleSessionMax(
      authUser,
      actor.roleSessionMaxHours,
    );
    if (!ok) return null;

    const { roleSessionMaxHours: _h, ...actorRest } = actor;

    const overlay = await readStaffViewOverlay();
    if (
      overlay &&
      overlay.actorUserId === authUser.id &&
      actorRest.roles.includes("SUPER_ADMIN") &&
      overlay.targetUserId !== authUser.id
    ) {
      const target = await loadAdminContextForUserId(overlay.targetUserId);
      if (target) {
        const { roleSessionMaxHours: _th, ...targetRest } = target;
        let targetEmail = targetRest.user.email;
        try {
          const service = createSupabaseServiceClient();
          const { data } = await service.auth.admin.getUserById(
            targetRest.user.id,
          );
          targetEmail = data.user?.email ?? targetEmail;
        } catch {
          // Banner can fall back to role label.
        }
        return {
          ...targetRest,
          user: { ...targetRest.user, email: targetEmail },
          impersonation: {
            actorUserId: actorRest.user.id,
            actorEmail: actorRest.user.email,
            targetUserId: targetRest.user.id,
            targetEmail,
            targetRoles: targetRest.roles,
          },
        };
      }
    }

    return { ...actorRest, impersonation: null };
  });
});

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
  // Prefer the resolved set (system map and/or DB role_permissions for custom roles).
  if (admin.permissions.has(permission)) return true;
  // System roles: fall back to TS map when DB seed is older than the catalog.
  return roleHasPermission(admin.roles, permission);
}

async function unauthorizedRedirectPath(): Promise<string> {
  const headerList = await headers();
  const token = headerList.get(STAFF_VIEW_HEADER);
  return getAdminPath("/unauthorized", {
    staffViewToken: token,
  });
}

export async function requireAdmin(
  permission?: Permission,
): Promise<AdminContext> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    const user = await getCurrentUser();
    if (!user) {
      redirect(getAdminPath("/login", { staffViewToken: null }));
    }
    redirect(await unauthorizedRedirectPath());
  }
  if (permission && !hasPermission(admin, permission)) {
    redirect(await unauthorizedRedirectPath());
  }
  return admin;
}

export async function requirePermission(
  permission: Permission,
): Promise<AdminContext> {
  return requireAdmin(permission);
}

/** Allow access when the admin has any one of the listed permissions. */
export async function requireAnyPermission(
  permissions: Permission[],
): Promise<AdminContext> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    const user = await getCurrentUser();
    if (!user) {
      redirect(getAdminPath("/login", { staffViewToken: null }));
    }
    redirect(await unauthorizedRedirectPath());
  }
  if (
    permissions.length > 0 &&
    !permissions.some((permission) => hasPermission(admin, permission))
  ) {
    redirect(await unauthorizedRedirectPath());
  }
  return admin;
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
  };
}
