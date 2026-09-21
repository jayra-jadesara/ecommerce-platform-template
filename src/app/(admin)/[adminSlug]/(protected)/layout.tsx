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
import { getSiteUrl } from "@/config/site";
import { getPlatformConfigAsync } from "@/config/site.server";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireAdmin();
  const { brand } = await getPlatformConfigAsync();
  const navItems = getAdminNavTreeForPermissions(admin.permissions);

  const headerList = await headers();
  const pathname = headerList.get("x-admin-pathname");
  if (pathname && !canAccessAdminPath(pathname, admin.permissions)) {
    redirect(adminUnauthorizedPath());
  }

  return (
    <AdminShell
      brandName={brand.name}
      email={admin.user.email}
      roles={admin.roles}
      navItems={navItems}
      siteUrl={getSiteUrl()}
    >
      {children}
    </AdminShell>
  );
}
