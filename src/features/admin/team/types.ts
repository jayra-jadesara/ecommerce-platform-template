import type { Permission } from "@/features/auth/permissions";
import type { AdminRoleCode } from "@/types/database";

/** Highest privilege first — used for pickers and primary-role display. */
export const ASSIGNABLE_ROLES: AdminRoleCode[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR",
  "MARKETING",
  "ORDER_MANAGER",
  "SUPPORT",
  "READER",
];

export type StaffRoleOption = {
  value: AdminRoleCode;
  label: string;
  /** One-line plain summary for the radio card. */
  description: string;
  /** Short access-level chip (shown in picker). */
  level: string;
  isSystem: boolean;
  /** Present for custom roles — used for menu Full/Read/Hidden preview. */
  permissions?: Permission[];
};

/** Store-scoped custom role, or an editable system role (not Super Admin). */
export type CustomRoleDefinition = {
  id: string;
  code: AdminRoleCode;
  name: string;
  description: string | null;
  permissions: Permission[];
  /** Built-in roles (Editor, Marketing, …). Super Admin is never listed. */
  isSystem?: boolean;
  /** Max hours since login before session is rejected; null = never (JWT only). */
  sessionMaxHours: number | null;
};

export const STAFF_ROLE_OPTIONS: StaffRoleOption[] = [
  {
    value: "SUPER_ADMIN",
    label: "Super Admin",
    description: "Full control — including team and audit",
    level: "Highest",
    isSystem: true,
  },
  {
    value: "ADMIN",
    label: "Admin",
    description: "Runs the whole store — except team rights",
    level: "Full store",
    isSystem: true,
  },
  {
    value: "EDITOR",
    label: "Editor",
    description: "Products, categories, pages, and media",
    level: "Catalog",
    isSystem: true,
  },
  {
    value: "MARKETING",
    label: "Marketing",
    description: "Promotions, blog, brochures, coupons, and homepage content",
    level: "Growth",
    isSystem: true,
  },
  {
    value: "ORDER_MANAGER",
    label: "Order Manager",
    description: "Fulfill orders and check payments & stock",
    level: "Sales",
    isSystem: true,
  },
  {
    value: "SUPPORT",
    label: "Support",
    description: "Help customers — orders and account questions",
    level: "Help desk",
    isSystem: true,
  },
  {
    value: "READER",
    label: "Read",
    description: "Look around only — cannot change anything",
    level: "View only",
    isSystem: true,
  },
];

/** System + custom roles for pickers / filters. */
export function buildStaffRoleOptions(
  customRoles: CustomRoleDefinition[],
): StaffRoleOption[] {
  const storeCustomOnly = customRoles.filter((role) => !role.isSystem);
  return [
    ...STAFF_ROLE_OPTIONS,
    ...storeCustomOnly.map((role) => ({
      value: role.code,
      label: role.name,
      description: role.description?.trim() || "Custom role for this store",
      level: "Custom",
      isSystem: false,
      permissions: role.permissions,
    })),
  ];
}

export type TeamMember = {
  userId: string;
  email: string | null;
  name: string | null;
  isActive: boolean;
  roles: AdminRoleCode[];
  createdAt: string;
  updatedAt: string;
};

/** Store shopper account that can be linked as staff (not already on the team). */
export type LinkableStoreAccount = {
  userId: string;
  email: string;
  name: string | null;
};

export type TeamListQuery = {
  search?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  role?: AdminRoleCode | "ALL";
  page?: number;
  pageSize?: number;
};

export type TeamListResult = {
  items: TeamMember[];
  total: number;
  page: number;
  pageSize: number;
};

export type TeamResult =
  | {
      ok: true;
      message: string;
      member?: TeamMember;
      /** Shown once after creating a new login — never persisted again. */
      temporaryPassword?: string;
      /** Returned after create/update custom role. */
      role?: CustomRoleDefinition;
    }
  | { ok: false; error: string; referenceId?: string };

export type StaffActivityItem = {
  id: string;
  action: string;
  actionLabel: string;
  entityType: string;
  entityLabel: string;
  entityId: string | null;
  createdAt: string;
  /** Compact one-line detail for the table cell. */
  summary: string | null;
  /** Full detail text shown on hover / tooltip. */
  detailFull: string | null;
};

export type StaffActivityQuery = {
  limit?: number;
  /** Inclusive YYYY-MM-DD */
  from?: string | null;
  /** Inclusive YYYY-MM-DD */
  to?: string | null;
  /** Page-level area tab */
  area?: string | null;
  search?: string | null;
};
