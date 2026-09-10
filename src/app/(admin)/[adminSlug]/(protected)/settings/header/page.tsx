import { HeaderSettingsForm } from "@/features/admin/settings/components/HeaderSettingsForm";
import { loadHeaderSettingsForm } from "@/features/admin/settings/load-forms";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getStoreBranding } from "@/features/theme/service";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminHeaderSettingsPage() {
  const admin = await requirePermission("settings.view");
  const [values, brand] = await Promise.all([
    loadHeaderSettingsForm(),
    getStoreBranding(),
  ]);
  const canUpdate = hasPermission(admin, "settings.update");

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Header layout"
        description="Top bar features, logo size, and announcement message."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Appearance", href: getAdminPath("/settings/theme") },
          { label: "Header" },
        ]}
      />
      <HeaderSettingsForm
        initialValues={values}
        brand={brand}
        canUpdate={canUpdate}
      />
    </div>
  );
}
