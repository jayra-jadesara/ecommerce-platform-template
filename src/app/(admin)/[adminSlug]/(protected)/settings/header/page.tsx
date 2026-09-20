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
        description="Logo size, overlap onto the hero, and announcement bar."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Header layout" },
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
