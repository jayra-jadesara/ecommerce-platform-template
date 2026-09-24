import { cookies } from "next/headers";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminTeamManager } from "@/features/admin/team/components/AdminTeamManager";
import {
  listAdminTeamMembers,
  listCustomRoles,
  listLinkableStoreAccounts,
} from "@/features/admin/team/service";
import { ASSIGNABLE_ROLES } from "@/features/admin/team/types";
import { getAdminPath } from "@/config/admin-route";
import {
  hasPermission,
  hasRole,
  requirePermission,
} from "@/features/auth/session";
import type { AdminRoleCode } from "@/types/database";

export const dynamic = "force-dynamic";

const STAFF_VIEW_FLASH_COOKIE = "wl_staff_view_flash";

function parseStatus(value: string | undefined): "ALL" | "ACTIVE" | "INACTIVE" {
  if (value === "ACTIVE" || value === "INACTIVE") return value;
  return "ALL";
}

function parseRole(
  value: string | undefined,
  customCodes: Set<string>,
): AdminRoleCode | "ALL" {
  if (!value) return "ALL";
  if ((ASSIGNABLE_ROLES as string[]).includes(value) || customCodes.has(value)) {
    return value as AdminRoleCode;
  }
  return "ALL";
}

function parsePageSize(value: string | undefined): 10 | 25 {
  return value === "25" ? 25 : 10;
}

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    status?: string;
    role?: string;
  }>;
}) {
  const admin = await requirePermission("users.view");
  const canManage =
    hasPermission(admin, "users.manage") && !admin.impersonation;
  const canImpersonate =
    hasRole(admin, "SUPER_ADMIN") &&
    hasPermission(admin, "users.manage") &&
    !admin.impersonation;
  const canCreateRoles =
    hasRole(admin, "SUPER_ADMIN") &&
    hasPermission(admin, "users.manage") &&
    !admin.impersonation;
  const params = await searchParams;

  const jar = await cookies();
  const staffViewError =
    jar.get(STAFF_VIEW_FLASH_COOKIE)?.value?.trim() || null;

  const customRoles = canManage ? await listCustomRoles() : [];
  const customCodes = new Set(customRoles.map((role) => role.code));

  const status = parseStatus(params.status);
  const role = parseRole(params.role, customCodes);
  const pageSize = parsePageSize(params.pageSize);
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.q?.trim() ?? "";

  const [list, linkableAccounts] = await Promise.all([
    listAdminTeamMembers({ search, status, role, page, pageSize }),
    canManage ? listLinkableStoreAccounts() : Promise.resolve([]),
  ]);

  const actorUserId = admin.impersonation?.actorUserId ?? admin.user.id;

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Team"
        description="Invite people to run your store. Turn off Admin access anytime — they can still shop."
        breadcrumbs={[
          { label: "Store", href: getAdminPath("/settings") },
          { label: "Team" },
        ]}
      />
      <AdminTeamManager
        initialMembers={list.items}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        initialSearch={search}
        initialStatus={status}
        initialRole={role}
        linkableAccounts={linkableAccounts}
        customRoles={customRoles}
        currentUserId={actorUserId}
        canManage={canManage}
        canViewActivity={
          hasPermission(admin, "users.view") ||
          hasPermission(admin, "audit.view")
        }
        allowSuperAdminAssign={hasRole(admin, "SUPER_ADMIN") && !admin.impersonation}
        canCreateRoles={canCreateRoles}
        canImpersonate={canImpersonate}
        isImpersonating={Boolean(admin.impersonation)}
        initialStaffViewError={staffViewError}
      />
    </div>
  );
}
