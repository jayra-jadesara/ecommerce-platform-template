"use server";

import { getAdminPath } from "@/config/admin-route";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";
import type { StaffActivityQuery } from "@/features/admin/team/types";
import type { AdminRoleCode } from "@/types/database";

const TEAM_ROUTE = getAdminPath("/team");

/**
 * Dynamic-import the server-only service so client components that import
 * these actions never statically pull in `import "server-only"`.
 */
async function teamService() {
  return import("@/features/admin/team/service");
}

export async function listAdminTeamMembersAction(input?: {
  search?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  role?: AdminRoleCode | "ALL";
  page?: number;
  pageSize?: number;
}) {
  const { listAdminTeamMembers } = await teamService();
  return listAdminTeamMembers(input);
}

export async function listLinkableStoreAccountsAction() {
  const { listLinkableStoreAccounts } = await teamService();
  return listLinkableStoreAccounts();
}

export async function addAdminByEmailAction(input: {
  email: string;
  role: AdminRoleCode;
  isActive?: boolean;
}) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "TEAM_ADD_ADMIN",
      feature: "USERS",
      route: TEAM_ROUTE,
    },
    async () => {
      const { addAdminByEmail } = await teamService();
      return addAdminByEmail({
        email: input.email,
        role: input.role,
        isActive: input.isActive,
      });
    },
  );
}

export async function createAdminStaffAction(input: {
  email: string;
  password: string;
  role: AdminRoleCode;
}) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "TEAM_CREATE_STAFF",
      feature: "USERS",
      route: TEAM_ROUTE,
    },
    async () => {
      const { createAdminStaff } = await teamService();
      return createAdminStaff(input);
    },
  );
}

export async function updateAdminRolesAction(
  userId: string,
  role: AdminRoleCode,
) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "TEAM_UPDATE_ROLES",
      feature: "USERS",
      entityType: "admin_users",
      entityId: userId,
      route: TEAM_ROUTE,
    },
    async () => {
      const { updateAdminRoles } = await teamService();
      return updateAdminRoles(userId, role);
    },
  );
}

export async function setAdminActiveAction(userId: string, isActive: boolean) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "TEAM_SET_ACTIVE",
      feature: "USERS",
      entityType: "admin_users",
      entityId: userId,
      route: TEAM_ROUTE,
    },
    async () => {
      const { setAdminActive } = await teamService();
      return setAdminActive(userId, isActive);
    },
  );
}

export async function listStaffActivityAction(
  userId: string,
  options?: StaffActivityQuery,
) {
  const { listStaffActivity } = await teamService();
  return listStaffActivity(userId, options);
}
