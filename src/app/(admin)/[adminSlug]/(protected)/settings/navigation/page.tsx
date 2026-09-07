import Link from "next/link";
import { NavigationSettingsForm } from "@/features/admin/settings/components/NavigationSettingsForm";
import { loadAdminNavigationItems } from "@/features/admin/settings/update-navigation";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

export const dynamic = "force-dynamic";

export default async function AdminNavigationSettingsPage() {
  const admin = await requirePermission("navigation.view");
  const items = await loadAdminNavigationItems();
  const canUpdate = hasPermission(admin, "navigation.update");

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        <Link
          href={getAdminPath("/settings")}
          className="text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Settings
        </Link>
        <span aria-hidden> / </span>
        Navigation
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Navigation
      </h1>
      <NavigationSettingsForm initialItems={items} canUpdate={canUpdate} />
    </div>
  );
}
