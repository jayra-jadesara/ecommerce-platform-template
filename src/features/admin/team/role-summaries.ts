import type { AdminRoleCode } from "@/types/database";
import { STAFF_ROLE_OPTIONS } from "@/features/admin/team/types";
import {
  ADMIN_NAV_SECTION_LABELS,
  getAdminNavTreeForPermissions,
  getAdminSidebarLinks,
  type AdminNavSection,
} from "@/features/admin/nav";
import { permissionsForRoles } from "@/features/auth/permissions";

/** Two-line plain summary — can / cannot. */
export const ROLE_QUICK: Record<
  AdminRoleCode,
  { can: string; cannot: string }
> = {
  SUPER_ADMIN: {
    can: "Everything in admin, including team",
    cannot: "Nothing blocked",
  },
  ADMIN: {
    can: "Run the whole store day to day",
    cannot: "Team & audit access",
  },
  EDITOR: {
    can: "Products, pages, and media",
    cannot: "Orders, payments, team",
  },
  MARKETING: {
    can: "Coupons, blog, and homepage content",
    cannot: "Orders, catalog edits, team",
  },
  ORDER_MANAGER: {
    can: "Orders, customers, and payments",
    cannot: "Products, content, team",
  },
  SUPPORT: {
    can: "Help with orders and customers",
    cannot: "Content, settings, team",
  },
  READER: {
    can: "Look at most pages",
    cannot: "Change or delete anything",
  },
};

/** Longer bullets kept for tests / docs; UI uses ROLE_QUICK. */
export const ROLE_SUMMARY_BULLETS: Record<AdminRoleCode, string[]> = {
  SUPER_ADMIN: [
    ROLE_QUICK.SUPER_ADMIN.can,
    "Can add or remove team members",
    ROLE_QUICK.SUPER_ADMIN.cannot,
  ],
  ADMIN: [
    ROLE_QUICK.ADMIN.can,
    "Can change store settings, shipping, and payments",
    `Cannot: ${ROLE_QUICK.ADMIN.cannot}`,
  ],
  EDITOR: [
    ROLE_QUICK.EDITOR.can,
    `Cannot: ${ROLE_QUICK.EDITOR.cannot}`,
  ],
  MARKETING: [
    ROLE_QUICK.MARKETING.can,
    `Cannot: ${ROLE_QUICK.MARKETING.cannot}`,
  ],
  ORDER_MANAGER: [
    ROLE_QUICK.ORDER_MANAGER.can,
    `Cannot: ${ROLE_QUICK.ORDER_MANAGER.cannot}`,
  ],
  SUPPORT: [
    ROLE_QUICK.SUPPORT.can,
    `Cannot: ${ROLE_QUICK.SUPPORT.cannot}`,
  ],
  READER: [
    ROLE_QUICK.READER.can,
    `Cannot: ${ROLE_QUICK.READER.cannot}`,
  ],
};

export function roleOptionLabel(role: AdminRoleCode): string {
  return (
    STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role
  );
}

export function roleOptionDescription(role: AdminRoleCode): string {
  return (
    STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.description ??
    ""
  );
}

export function roleOptionLevel(role: AdminRoleCode): string {
  return (
    STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.level ?? ""
  );
}

/** Sidebar section labels this role will see (others stay hidden). */
export function roleSidebarSections(role: AdminRoleCode): string[] {
  const tree = getAdminNavTreeForPermissions(permissionsForRoles([role]));
  const links = getAdminSidebarLinks(tree);
  const seen = new Set<AdminNavSection>();
  const ordered: string[] = [];
  for (const link of links) {
    if (seen.has(link.section)) continue;
    seen.add(link.section);
    ordered.push(ADMIN_NAV_SECTION_LABELS[link.section]);
  }
  return ordered;
}

/** Short menu names for the role card (easy to scan). */
export function roleSidebarMenuLabels(role: AdminRoleCode): string[] {
  const tree = getAdminNavTreeForPermissions(permissionsForRoles([role]));
  return getAdminSidebarLinks(tree).map((link) =>
    link.label.replace(/^All /, ""),
  );
}
