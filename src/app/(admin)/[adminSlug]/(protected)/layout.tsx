import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { getAdminNavTreeForPermissions } from "@/features/admin/nav";
import { requireAdmin } from "@/features/auth/session";
import { getPlatformConfigAsync } from "@/config/site";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireAdmin();
  const { brand } = await getPlatformConfigAsync();
  const navItems = getAdminNavTreeForPermissions(admin.permissions);

  return (
    <AdminShell
      brandName={brand.name}
      email={admin.user.email}
      roles={admin.roles}
      navItems={navItems}
    >
      {children}
    </AdminShell>
  );
}
