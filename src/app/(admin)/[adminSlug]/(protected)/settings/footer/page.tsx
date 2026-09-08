import { FooterSettingsForm } from "@/features/admin/settings/components/FooterSettingsForm";
import { loadFooterSettingsForm } from "@/features/admin/settings/load-forms";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getStoreBranding } from "@/features/theme/service";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminFooterSettingsPage() {
  const admin = await requirePermission("settings.view");
  const [values, brand] = await Promise.all([
    loadFooterSettingsForm(),
    getStoreBranding(),
  ]);
  const canUpdate = hasPermission(admin, "settings.update");

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Footer layout"
        description="Footer text and which contact details to show."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Appearance", href: getAdminPath("/settings/theme") },
          { label: "Footer" },
        ]}
      />
      <FooterSettingsForm
        initialValues={values}
        brand={brand}
        canUpdate={canUpdate}
      />
    </div>
  );
}
