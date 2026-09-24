import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { getAdminNavTreeForPermissions } from "@/features/admin/nav";
import {
  adminUnauthorizedPath,
  canAccessAdminPath,
} from "@/features/admin/route-permissions";
import { requireAdmin } from "@/features/auth/session";
import { STAFF_VIEW_HEADER } from "@/features/auth/staff-view-constants";
import { getSiteUrl } from "@/config/site";
import { getPlatformConfigAsync } from "@/config/site.server";
import { APP_VERSION } from "@/config/version";
import { StorefrontPathsProvider } from "@/features/seo/StorefrontPathsProvider";
import { resolveAdminStorefrontPaths } from "@/features/seo/storefront-paths.server";

export const dynamic = "force-dynamic";

function formatRoleLabel(roles: string[]): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    EDITOR: "Editor",
    MARKETING: "Marketing",
    ORDER_MANAGER: "Order Manager",
    SUPPORT: "Support",
    READER: "Read",
  };
  return roles.map((r) => map[r] ?? r).join(" · ");
}

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireAdmin();
  const [config, storefrontPaths] = await Promise.all([
    getPlatformConfigAsync(),
    resolveAdminStorefrontPaths(),
  ]);
  const { brand } = config;
  const navItems = getAdminNavTreeForPermissions(admin.permissions);

  const headerList = await headers();
  const pathname = headerList.get("x-admin-pathname");
  const staffViewToken = headerList.get(STAFF_VIEW_HEADER);
  if (pathname && !canAccessAdminPath(pathname, admin.permissions)) {
    redirect(adminUnauthorizedPath(staffViewToken));
  }

  const impersonation = admin.impersonation
    ? {
        actorEmail: admin.impersonation.actorEmail,
        targetEmail: admin.impersonation.targetEmail,
        targetRoleLabel: formatRoleLabel(admin.impersonation.targetRoles),
      }
    : null;

  return (
    <AdminShell
      brandName={brand.name}
      email={admin.user.email}
      roles={admin.roles}
      navItems={navItems}
      siteUrl={getSiteUrl()}
      appVersion={APP_VERSION}
      impersonation={impersonation}
      staffViewToken={staffViewToken}
    >
      <StorefrontPathsProvider paths={storefrontPaths}>
        {children}
      </StorefrontPathsProvider>
    </AdminShell>
  );
}
