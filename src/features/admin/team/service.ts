import "server-only";

import { getAdminPath } from "@/config/admin-route";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  entityTypesForArea,
  isActivityAreaId,
  type ActivityAreaId,
} from "@/features/admin/team/activity-areas";
import {
  staffActionLabel,
  staffEntityLabel,
} from "@/features/admin/team/activity-labels";
import {
  ASSIGNABLE_ROLES,
  type LinkableStoreAccount,
  type StaffActivityItem,
  type StaffActivityQuery,
  type TeamListQuery,
  type TeamListResult,
  type TeamMember,
  type TeamResult,
} from "@/features/admin/team/types";
import { formatDateTime } from "@/lib/format-date";
import {
  hasAnyRole,
  permissionsForRoles,
  type Permission,
} from "@/features/auth/permissions";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import { authEmailSchema } from "@/features/auth/validations";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminRoleCode } from "@/types/database";

const TEAM_ROUTE = getAdminPath("/team");

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeRoles(roles: AdminRoleCode[]): AdminRoleCode[] {
  const allowed = new Set(ASSIGNABLE_ROLES);
  return [...new Set(roles.filter((role) => allowed.has(role)))];
}

function normalizeSingleRole(
  role: AdminRoleCode | AdminRoleCode[] | undefined,
  roles?: AdminRoleCode[],
): AdminRoleCode | null {
  if (role && !Array.isArray(role) && ASSIGNABLE_ROLES.includes(role)) {
    return role;
  }
  const list = normalizeRoles(
    Array.isArray(role) ? role : roles ?? [],
  );
  return list[0] ?? null;
}

function assertCanAssignRole(
  actorRoles: AdminRoleCode[],
  role: AdminRoleCode,
): string | null {
  if (role === "SUPER_ADMIN" && !hasAnyRole(actorRoles, ["SUPER_ADMIN"])) {
    return "Only a Super Admin can assign the Super Admin role.";
  }
  return null;
}

function displayName(
  profile: { first_name: string | null; last_name: string | null } | null,
): string | null {
  if (!profile) return null;
  const name = [profile.first_name, profile.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return name || null;
}

async function loadRoleIdMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<Map<AdminRoleCode, string>> {
  const { data } = await supabase.from("roles").select("id, code");
  const map = new Map<AdminRoleCode, string>();
  for (const row of data ?? []) {
    if (row.code) map.set(row.code as AdminRoleCode, row.id);
  }
  return map;
}

async function loadRolesForUser(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<AdminRoleCode[]> {
  const { data: links } = await supabase
    .from("admin_user_roles")
    .select("role_id")
    .eq("user_id", userId);
  if (!links?.length) return [];
  const roleIds = links.map((row) => row.role_id);
  const { data: roles } = await supabase
    .from("roles")
    .select("code")
    .in("id", roleIds);
  return (roles ?? [])
    .map((row) => row.code)
    .filter((code): code is AdminRoleCode => Boolean(code));
}

async function countActiveSuperAdmins(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<number> {
  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("code", "SUPER_ADMIN")
    .maybeSingle();
  if (!role?.id) return 0;

  const { data: links } = await supabase
    .from("admin_user_roles")
    .select("user_id")
    .eq("role_id", role.id);
  if (!links?.length) return 0;

  const userIds = links.map((row) => row.user_id);
  const { data: admins } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("is_active", true)
    .in("user_id", userIds);

  return admins?.length ?? 0;
}

async function resolveEmailForUserIds(
  userIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (!userIds.length) return map;

  try {
    const service = createSupabaseServiceClient();
    await Promise.all(
      userIds.map(async (id) => {
        const { data, error } = await service.auth.admin.getUserById(id);
        if (error || !data.user) {
          map.set(id, null);
          return;
        }
        map.set(id, data.user.email ?? null);
      }),
    );
  } catch {
    for (const id of userIds) map.set(id, null);
  }
  return map;
}

async function replaceUserRoles(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  roles: AdminRoleCode[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const roleMap = await loadRoleIdMap(supabase);
  const roleIds: string[] = [];
  for (const code of roles) {
    const id = roleMap.get(code);
    if (!id) {
      return { ok: false, error: `Unknown role: ${code}` };
    }
    roleIds.push(id);
  }

  const { error: deleteError } = await supabase
    .from("admin_user_roles")
    .delete()
    .eq("user_id", userId);
  if (deleteError) {
    return { ok: false, error: "Unable to update roles." };
  }

  if (roleIds.length) {
    const { error: insertError } = await supabase.from("admin_user_roles").insert(
      roleIds.map((role_id) => ({ user_id: userId, role_id })),
    );
    if (insertError) {
      return { ok: false, error: "Unable to assign roles." };
    }
  }

  return { ok: true };
}

function wouldRemoveLastSuperAdmin(input: {
  targetCurrentRoles: AdminRoleCode[];
  targetCurrentlyActive: boolean;
  targetNextRoles: AdminRoleCode[];
  targetNextActive: boolean;
  activeSuperAdminCount: number;
}): string | null {
  const countedNow =
    input.targetCurrentlyActive &&
    input.targetCurrentRoles.includes("SUPER_ADMIN");
  const countedNext =
    input.targetNextActive && input.targetNextRoles.includes("SUPER_ADMIN");

  if (!countedNow || countedNext) return null;
  if (input.activeSuperAdminCount > 1) return null;

  return "You can't remove or deactivate the last Super Admin.";
}

export async function listAdminTeamMembers(
  input?: TeamListQuery,
): Promise<TeamListResult> {
  const pageSizeRaw = input?.pageSize ?? 10;
  const pageSize = pageSizeRaw === 25 ? 25 : 10;
  const page = Math.max(1, input?.page ?? 1);
  const empty: TeamListResult = { items: [], total: 0, page, pageSize };

  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "users.view")) return empty;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("admin_users")
    .select("user_id, is_active, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (input?.status === "ACTIVE") query = query.eq("is_active", true);
  if (input?.status === "INACTIVE") query = query.eq("is_active", false);

  const { data: rows, error } = await query;
  if (error || !rows?.length) return empty;

  const userIds = rows.map((row) => row.user_id);
  const [{ data: profiles }, { data: links }, { data: roleRows }, emails] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("id, first_name, last_name")
        .in("id", userIds),
      supabase
        .from("admin_user_roles")
        .select("user_id, role_id")
        .in("user_id", userIds),
      supabase.from("roles").select("id, code"),
      resolveEmailForUserIds(userIds),
    ]);

  const roleById = new Map(
    (roleRows ?? []).map((row) => [row.id, row.code as AdminRoleCode]),
  );
  const rolesByUser = new Map<string, AdminRoleCode[]>();
  for (const link of links ?? []) {
    const code = roleById.get(link.role_id);
    if (!code) continue;
    const list = rolesByUser.get(link.user_id) ?? [];
    list.push(code);
    rolesByUser.set(link.user_id, list);
  }
  const profileById = new Map((profiles ?? []).map((row) => [row.id, row]));

  const search = input?.search?.trim().toLowerCase() ?? "";
  const roleFilter =
    input?.role && input.role !== "ALL" ? input.role : null;

  let members: TeamMember[] = rows.map((row) => {
    const profile = profileById.get(row.user_id) ?? null;
    return {
      userId: row.user_id,
      email: emails.get(row.user_id) ?? null,
      name: displayName(profile),
      isActive: row.is_active,
      roles: rolesByUser.get(row.user_id) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  if (search) {
    members = members.filter((member) => {
      const haystack = [member.email, member.name, ...member.roles]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  if (roleFilter) {
    members = members.filter((member) => member.roles.includes(roleFilter));
  }

  const total = members.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * pageSize;

  return {
    items: members.slice(from, from + pageSize),
    total,
    page: safePage,
    pageSize,
  };
}

/**
 * Store accounts not already on the admin team — for the Add Staff
 * “Existing email” searchable dropdown. Uses auth listUsers so large
 * directories stay complete (not capped by a small profile sample).
 */
export async function listLinkableStoreAccounts(): Promise<
  LinkableStoreAccount[]
> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "users.manage")) return [];

  const supabase = await createSupabaseServerClient();
  const { data: staffRows } = await supabase
    .from("admin_users")
    .select("user_id");
  const staffIds = new Set((staffRows ?? []).map((row) => row.user_id));

  let service: ReturnType<typeof createSupabaseServiceClient>;
  try {
    service = createSupabaseServiceClient();
  } catch {
    return [];
  }

  const byId = new Map<string, LinkableStoreAccount>();
  const perPage = 200;
  const maxPages = 25;

  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) break;
    const users = data?.users ?? [];
    if (!users.length) break;

    for (const user of users) {
      if (staffIds.has(user.id)) continue;
      const email = user.email?.trim().toLowerCase();
      if (!email) continue;
      byId.set(user.id, {
        userId: user.id,
        email,
        name: null,
      });
    }

    if (users.length < perPage) break;
  }

  const ids = [...byId.keys()];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name")
      .in("id", chunk);
    for (const row of profiles ?? []) {
      const entry = byId.get(row.id);
      if (!entry) continue;
      const name = displayName(row);
      if (name) entry.name = name;
    }
  }

  return [...byId.values()].sort((a, b) => a.email.localeCompare(b.email));
}

export async function addAdminByEmail(input: {
  email: string;
  /** Preferred: exactly one job role. */
  role?: AdminRoleCode;
  /** @deprecated Prefer `role` — only the first role is kept. */
  roles?: AdminRoleCode[];
  isActive?: boolean;
}): Promise<TeamResult> {
  const actor = await getCurrentAdmin();
  if (!actor || !hasPermission(actor, "users.manage")) {
    return { ok: false, error: "You do not have permission to manage team." };
  }

  const email = normalizeEmail(input.email);
  const emailCheck = authEmailSchema.safeParse(email);
  if (!emailCheck.success) {
    return {
      ok: false,
      error: emailCheck.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const role = normalizeSingleRole(input.role, input.roles);
  if (!role) {
    return { ok: false, error: "Select a job role." };
  }

  const assignError = assertCanAssignRole(actor.roles, role);
  if (assignError) return { ok: false, error: assignError };

  const roles: AdminRoleCode[] = [role];

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  let userId: string | null = null;
  try {
    const service = createSupabaseServiceClient();
    const { data, error: lookupError } = await service.rpc(
      "lookup_auth_user_id_by_email",
      { p_email: email },
    );
    if (lookupError) {
      return unexpectedFailure({
        type: "DATABASE",
        source: "DATABASE",
        operation: "TEAM_LOOKUP_EMAIL",
        feature: "USERS",
        message: "Unable to look up user by email",
        error: lookupError,
        databaseCode: lookupError.code,
        storeId,
        route: TEAM_ROUTE,
      });
    }
    userId = data;
  } catch (error) {
    return unexpectedFailure({
      type: "SERVER",
      source: "SERVER",
      operation: "TEAM_LOOKUP_EMAIL",
      feature: "USERS",
      message: "Unable to look up user by email",
      error,
      storeId,
      route: TEAM_ROUTE,
    });
  }

  if (!userId) {
    return {
      ok: false,
      error:
        "No account found for that email. Choose “New login” or ask them to register on the store first.",
    };
  }

  const isActive = input.isActive ?? true;
  const { error: upsertError } = await supabase.from("admin_users").upsert(
    {
      user_id: userId,
      store_id: storeId,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "TEAM_ADD_ADMIN",
      feature: "USERS",
      message: "Unable to add admin user",
      error: upsertError,
      databaseCode: upsertError.code,
      storeId,
      entityType: "admin_users",
      entityId: userId,
      route: TEAM_ROUTE,
    });
  }

  const roleResult = await replaceUserRoles(supabase, userId, roles);
  if (!roleResult.ok) return roleResult;

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: actor.user.id,
    action: "ADMIN_USER_ADDED",
    entity_type: "admin_users",
    entity_id: userId,
    metadata: { email, roles, is_active: isActive },
  });

  const member = await getAdminTeamMember(userId);

  return {
    ok: true,
    message: "Team member added.",
    member: member ?? undefined,
  };
}

/** Create a new Auth login + admin access with a temporary password. */
export async function createAdminStaff(input: {
  email: string;
  password: string;
  role: AdminRoleCode;
}): Promise<TeamResult> {
  const actor = await getCurrentAdmin();
  if (!actor || !hasPermission(actor, "users.manage")) {
    return { ok: false, error: "You do not have permission to manage team." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      ok: false,
      error: "Staff creation is not configured (missing service role key).",
    };
  }

  const email = normalizeEmail(input.email);
  const emailCheck = authEmailSchema.safeParse(email);
  if (!emailCheck.success) {
    return {
      ok: false,
      error: emailCheck.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const password = input.password;
  if (!password || password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password.length > 72) {
    return { ok: false, error: "Password is too long." };
  }

  const role = normalizeSingleRole(input.role);
  if (!role) {
    return { ok: false, error: "Select a job role." };
  }

  const assignError = assertCanAssignRole(actor.roles, role);
  if (assignError) return { ok: false, error: assignError };

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  let existingId: string | null = null;
  try {
    const service = createSupabaseServiceClient();
    const { data, error: lookupError } = await service.rpc(
      "lookup_auth_user_id_by_email",
      { p_email: email },
    );
    if (lookupError) {
      return unexpectedFailure({
        type: "DATABASE",
        source: "DATABASE",
        operation: "TEAM_LOOKUP_EMAIL",
        feature: "USERS",
        message: "Unable to look up user by email",
        error: lookupError,
        databaseCode: lookupError.code,
        storeId,
        route: TEAM_ROUTE,
      });
    }
    existingId = data;
  } catch (error) {
    return unexpectedFailure({
      type: "SERVER",
      source: "SERVER",
      operation: "TEAM_LOOKUP_EMAIL",
      feature: "USERS",
      message: "Unable to look up user by email",
      error,
      storeId,
      route: TEAM_ROUTE,
    });
  }

  if (existingId) {
    return {
      ok: false,
      error:
        "Account exists — choose “Existing account” to link them.",
    };
  }

  let userId: string;
  try {
    const service = createSupabaseServiceClient();
    const { data: created, error: createError } =
      await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          created_by_admin: true,
        },
      });

    if (createError) {
      const msg = createError.message.toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists")
      ) {
        return {
          ok: false,
          error:
            "Account exists — choose “Existing account” to link them.",
        };
      }
      return unexpectedFailure({
        type: "SERVER",
        source: "SERVER",
        operation: "TEAM_CREATE_STAFF",
        feature: "USERS",
        message: createError.message,
        error: createError,
        storeId,
        route: TEAM_ROUTE,
      });
    }

    if (!created.user) {
      return { ok: false, error: "Unable to create staff account." };
    }
    userId = created.user.id;

    await service.from("user_profiles").upsert(
      {
        id: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch (error) {
    return unexpectedFailure({
      type: "SERVER",
      source: "SERVER",
      operation: "TEAM_CREATE_STAFF",
      feature: "USERS",
      message: "Unable to create staff account",
      error,
      storeId,
      route: TEAM_ROUTE,
    });
  }

  const { error: upsertError } = await supabase.from("admin_users").upsert(
    {
      user_id: userId,
      store_id: storeId,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "TEAM_CREATE_STAFF",
      feature: "USERS",
      message: "Unable to add admin user",
      error: upsertError,
      databaseCode: upsertError.code,
      storeId,
      entityType: "admin_users",
      entityId: userId,
      route: TEAM_ROUTE,
    });
  }

  const roleResult = await replaceUserRoles(supabase, userId, [role]);
  if (!roleResult.ok) return roleResult;

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: actor.user.id,
    action: "ADMIN_USER_CREATED",
    entity_type: "admin_users",
    entity_id: userId,
    metadata: { email, roles: [role], is_active: true },
  });

  const member = await getAdminTeamMember(userId);

  return {
    ok: true,
    message: "Staff login created. Share the temporary password now.",
    member: member ?? undefined,
    temporaryPassword: password,
  };
}

export async function updateAdminRoles(
  userId: string,
  roleOrRoles: AdminRoleCode | AdminRoleCode[],
): Promise<TeamResult> {
  const actor = await getCurrentAdmin();
  if (!actor || !hasPermission(actor, "users.manage")) {
    return { ok: false, error: "You do not have permission to manage team." };
  }

  const role = normalizeSingleRole(
    Array.isArray(roleOrRoles) ? undefined : roleOrRoles,
    Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles],
  );
  if (!role) {
    return { ok: false, error: "Select a job role." };
  }

  const assignError = assertCanAssignRole(actor.roles, role);
  if (assignError) return { ok: false, error: assignError };

  const roles: AdminRoleCode[] = [role];

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);

  const { data: target } = await supabase
    .from("admin_users")
    .select("user_id, is_active")
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Team member not found." };

  const currentRoles = await loadRolesForUser(supabase, userId);
  const activeSuperCount = await countActiveSuperAdmins(supabase);
  const lastGuard = wouldRemoveLastSuperAdmin({
    targetCurrentRoles: currentRoles,
    targetCurrentlyActive: target.is_active,
    targetNextRoles: roles,
    targetNextActive: target.is_active,
    activeSuperAdminCount: activeSuperCount,
  });
  if (lastGuard) return { ok: false, error: lastGuard };

  const roleResult = await replaceUserRoles(supabase, userId, roles);
  if (!roleResult.ok) return roleResult;

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: actor.user.id,
    action: "ADMIN_ROLES_UPDATED",
    entity_type: "admin_users",
    entity_id: userId,
    metadata: { roles, previous_roles: currentRoles },
  });

  return { ok: true, message: "Role updated." };
}

function shortId(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const id = value.trim();
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "yes" : "no";
  return null;
}

function asStringList(value: unknown, limit = 4): string | null {
  if (!Array.isArray(value) || !value.length) return null;
  const parts = value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, limit);
  if (!parts.length) return null;
  const more = value.length > parts.length ? ` +${value.length - parts.length}` : "";
  return `${parts.join(", ")}${more}`;
}

function formatAmountMinor(value: unknown): string | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `₹${(n / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function truncateText(value: string, max = 72): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

const META_SKIP = new Set(["stack", "userAgent", "user_agent", "raw", "payload"]);

function formatMetaValue(value: unknown, full: boolean): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    return full ? text : truncateText(text, 64);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (!value.length) return null;
    if (value.every((item) => typeof item !== "object" || item == null)) {
      const list = asStringList(value, full ? 20 : 4);
      return list;
    }
    try {
      const json = JSON.stringify(value);
      return full ? json : truncateText(json, 80);
    } catch {
      return `${value.length} items`;
    }
  }
  if (typeof value === "object") {
    try {
      const json = JSON.stringify(value);
      return full ? json : truncateText(json, 80);
    } catch {
      return null;
    }
  }
  return null;
}

/** Human-readable one-liner from audit_logs.metadata (+ optional entity id). */
function activitySummary(
  metadata: unknown,
  entityId?: string | null,
): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return shortId(entityId);
  }
  const record = metadata as Record<string, unknown>;
  const bits: string[] = [];

  const orderNumber =
    asString(record.orderNumber) ?? asString(record.order_number);
  if (orderNumber) bits.push(`#${orderNumber}`);

  const reference =
    asString(record.reference_id) ?? asString(record.referenceId);
  if (reference) bits.push(reference);

  const email = asString(record.email);
  if (email) bits.push(email);

  const name = asString(record.name) ?? asString(record.title);
  if (name) bits.push(name);

  const slug = asString(record.slug);
  if (slug) bits.push(slug);

  const path = asString(record.path) ?? asString(record.storage_path);
  if (path) {
    const file = path.split("/").pop() || path;
    bits.push(file);
  }

  const folder = asString(record.folder);
  if (folder && !path) bits.push(folder);

  const status = asString(record.status);
  const from = asString(record.from);
  const to = asString(record.to);
  if (from && to) bits.push(`${from} → ${to}`);
  else if (status) bits.push(status);

  if (Array.isArray(record.roles) && record.roles.length) {
    bits.push(`role: ${String(record.roles[0])}`);
  }

  const changed =
    asStringList(record.changed_fields) ?? asStringList(record.changed);
  if (changed) bits.push(`changed: ${changed}`);

  const message =
    asString(record.message) ??
    asString(record.reason) ??
    asString(record.error) ??
    asString(record.safeMessage);
  if (message) bits.push(truncateText(message, 64));

  const amount =
    formatAmountMinor(record.amountMinor) ??
    formatAmountMinor(record.amount_minor);
  if (amount) bits.push(amount);

  const quantity = asString(record.quantity);
  if (quantity) bits.push(`qty ${quantity}`);

  const itemCount = asString(record.item_count);
  if (itemCount) bits.push(`${itemCount} items`);

  const errorType = asString(record.type) ?? asString(record.errorType);
  if (errorType && !bits.some((bit) => bit === errorType)) {
    bits.unshift(errorType);
  }

  const route = asString(record.route) ?? asString(record.requestPath);
  if (route) bits.push(route);

  if (Array.isArray(record.shortages) && record.shortages.length) {
    bits.push(`${record.shortages.length} shortage(s)`);
  }

  if (!bits.length) {
    const orderId = shortId(
      asString(record.orderId) ?? asString(record.order_id),
    );
    if (orderId) bits.push(`order ${orderId}`);
    const paymentId = shortId(
      asString(record.paymentId) ?? asString(record.payment_id),
    );
    if (paymentId) bits.push(`payment ${paymentId}`);
    const productId = shortId(
      asString(record.product_id) ?? asString(record.productId),
    );
    if (productId) bits.push(`product ${productId}`);
  }

  if (!bits.length) {
    const fallback = shortId(entityId);
    if (fallback) bits.push(fallback);
  }

  return bits.length ? bits.join(" · ") : null;
}

/** Multi-line hover copy: full IDs + every useful metadata field. */
function activityDetailFull(
  metadata: unknown,
  options: {
    actionLabel: string;
    entityLabel: string;
    entityId: string | null;
    createdAt: string;
  },
): string {
  const lines: string[] = [
    options.actionLabel,
    `${options.entityLabel} · ${formatDateTime(options.createdAt)}`,
  ];

  if (options.entityId?.trim()) {
    lines.push(`Record ID: ${options.entityId.trim()}`);
  }

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return lines.join("\n");
  }

  const record = metadata as Record<string, unknown>;
  const from = asString(record.from);
  const to = asString(record.to);
  if (from && to) {
    lines.push(`Status: ${from} → ${to}`);
  }

  const preferredOrder = [
    "orderNumber",
    "order_number",
    "orderId",
    "order_id",
    "paymentId",
    "payment_id",
    "reference_id",
    "referenceId",
    "email",
    "name",
    "title",
    "slug",
    "status",
    "message",
    "reason",
    "error",
    "type",
    "route",
    "path",
    "folder",
    "amountMinor",
    "amount_minor",
    "quantity",
    "roles",
    "changed_fields",
    "changed",
    "product_id",
    "productId",
  ];

  const skip = new Set<string>([...META_SKIP]);
  if (from && to) {
    skip.add("from");
    skip.add("to");
  }

  const seen = new Set<string>();
  const pushLine = (key: string, value: unknown) => {
    if (seen.has(key) || skip.has(key)) return;
    const formatted = formatMetaValue(value, true);
    if (!formatted) return;
    seen.add(key);
    const label = key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (char) => char.toUpperCase());
    lines.push(`${label}: ${formatted}`);
  };

  for (const key of preferredOrder) {
    if (key in record) pushLine(key, record[key]);
  }
  for (const [key, value] of Object.entries(record)) {
    pushLine(key, value);
  }

  return lines.join("\n");
}

function parseDayBound(value: string | null | undefined, endOfDay: boolean): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`;
}

export async function getAdminTeamMember(
  userId: string,
): Promise<TeamMember | null> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "users.view")) return null;

  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("admin_users")
    .select("user_id, is_active, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return null;

  const [{ data: profile }, roles, emails] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, first_name, last_name")
      .eq("id", userId)
      .maybeSingle(),
    loadRolesForUser(supabase, userId),
    resolveEmailForUserIds([userId]),
  ]);

  return {
    userId: row.user_id,
    email: emails.get(row.user_id) ?? null,
    name: displayName(profile),
    isActive: row.is_active,
    roles,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Audit log rows for a staff member, with optional date / area / search filters. */
export async function listStaffActivity(
  userId: string,
  options?: StaffActivityQuery,
): Promise<StaffActivityItem[]> {
  const actor = await getCurrentAdmin();
  if (
    !actor ||
    !(hasPermission(actor, "users.view") || hasPermission(actor, "audit.view"))
  ) {
    return [];
  }

  const limit = Math.min(Math.max(options?.limit ?? 200, 1), 500);
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);

  let query = supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const fromIso = parseDayBound(options?.from, false);
  const toIso = parseDayBound(options?.to, true);
  if (fromIso) query = query.gte("created_at", fromIso);
  if (toIso) query = query.lte("created_at", toIso);

  const areaRaw = options?.area?.trim() ?? "";
  const area: ActivityAreaId | null = isActivityAreaId(areaRaw) ? areaRaw : null;
  const entityTypes = area ? entityTypesForArea(area) : null;
  if (entityTypes?.length) {
    query = query.in("entity_type", entityTypes);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const search = options?.search?.trim().toLowerCase() ?? "";
  const mapped: StaffActivityItem[] = data.map((row) => {
    const actionLabel = staffActionLabel(row.action);
    const entityLabel = staffEntityLabel(row.entity_type);
    return {
      id: row.id,
      action: row.action,
      actionLabel,
      entityType: row.entity_type,
      entityLabel,
      entityId: row.entity_id,
      createdAt: row.created_at,
      summary: activitySummary(row.metadata, row.entity_id),
      detailFull: activityDetailFull(row.metadata, {
        actionLabel,
        entityLabel,
        entityId: row.entity_id,
        createdAt: row.created_at,
      }),
    };
  });

  // Enrich error rows with the actual message (audit metadata only stores reference_id).
  const errorIds = [
    ...new Set(
      mapped
        .filter(
          (item) =>
            /error/i.test(item.entityType) && Boolean(item.entityId?.trim()),
        )
        .map((item) => item.entityId!),
    ),
  ].slice(0, 80);

  if (errorIds.length) {
    const { data: errors } = await supabase
      .from("error_logs")
      .select("id, message, reference_id, type, route")
      .in("id", errorIds);
    if (errors?.length) {
      const byId = new Map(errors.map((row) => [row.id, row]));
      for (const item of mapped) {
        if (!item.entityId || !/error/i.test(item.entityType)) continue;
        const err = byId.get(item.entityId);
        if (!err) continue;
        const shortBits = [
          asString(err.type),
          err.message ? truncateText(err.message, 64) : null,
          asString(err.route),
          asString(err.reference_id),
        ].filter((bit): bit is string => Boolean(bit));
        if (shortBits.length) item.summary = shortBits.join(" · ");

        const fullLines = [
          item.actionLabel,
          `${item.entityLabel} · ${formatDateTime(item.createdAt)}`,
          item.entityId ? `Record ID: ${item.entityId}` : null,
          asString(err.type) ? `Type: ${err.type}` : null,
          err.message ? `Message: ${err.message}` : null,
          asString(err.route) ? `Route: ${err.route}` : null,
          asString(err.reference_id)
            ? `Reference: ${err.reference_id}`
            : null,
        ].filter((bit): bit is string => Boolean(bit));
        item.detailFull = fullLines.join("\n");
      }
    }
  }

  if (!search) return mapped;

  return mapped.filter((item) => {
    const hay = [
      item.actionLabel,
      item.entityLabel,
      item.action,
      item.entityType,
      item.summary,
      item.detailFull,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(search);
  });
}

export async function setAdminActive(
  userId: string,
  isActive: boolean,
): Promise<TeamResult> {
  const actor = await getCurrentAdmin();
  if (!actor || !hasPermission(actor, "users.manage")) {
    return { ok: false, error: "You do not have permission to manage team." };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);

  const { data: target } = await supabase
    .from("admin_users")
    .select("user_id, is_active")
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Team member not found." };

  if (target.is_active === isActive) {
    return {
      ok: true,
      message: isActive ? "Already active." : "Already inactive.",
    };
  }

  const currentRoles = await loadRolesForUser(supabase, userId);
  if (!isActive) {
    const activeSuperCount = await countActiveSuperAdmins(supabase);
    const lastGuard = wouldRemoveLastSuperAdmin({
      targetCurrentRoles: currentRoles,
      targetCurrentlyActive: target.is_active,
      targetNextRoles: currentRoles,
      targetNextActive: false,
      activeSuperAdminCount: activeSuperCount,
    });
    if (lastGuard) return { ok: false, error: lastGuard };
  }

  const { error } = await supabase
    .from("admin_users")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "TEAM_SET_ACTIVE",
      feature: "USERS",
      message: "Unable to update admin status",
      error,
      databaseCode: error.code,
      storeId,
      entityType: "admin_users",
      entityId: userId,
      route: TEAM_ROUTE,
    });
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: actor.user.id,
    action: isActive ? "ADMIN_USER_ACTIVATED" : "ADMIN_USER_DEACTIVATED",
    entity_type: "admin_users",
    entity_id: userId,
    metadata: { is_active: isActive },
  });

  return {
    ok: true,
    message: isActive
      ? "Admin access restored."
      : "Admin access revoked. They can still shop on the store.",
  };
}

/** Expose effective permission set for UI previews. */
export function effectivePermissionsForRoles(
  roles: AdminRoleCode[],
): Permission[] {
  return [...permissionsForRoles(roles)].sort();
}
