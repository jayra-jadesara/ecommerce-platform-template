import { NavigationSettingsForm } from "@/features/admin/settings/components/NavigationSettingsForm";
import { loadAdminNavigationItems } from "@/features/admin/settings/update-navigation";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminNavigationSettingsPage() {
  const admin = await requirePermission("navigation.view");
  const items = await loadAdminNavigationItems();
  const canUpdate = hasPermission(admin, "navigation.update");

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Menu & Navigation"
        description="All store pages are listed. Edit the menu name and choose top or bottom."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Menu & Navigation" },
        ]}
      />
      <NavigationSettingsForm initialItems={items} canUpdate={canUpdate} />
    </div>
  );
}
