import { BrandingSettingsForm } from "@/features/admin/settings/components/BrandingSettingsForm";
import { loadBrandingSettingsForm } from "@/features/admin/settings/load-forms";
import { getImageUploadLimits } from "@/features/media/upload-limits.server";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminBrandingSettingsPage() {
  const admin = await requirePermission("branding.view");
  const [{ values, previewUrls }, limits] = await Promise.all([
    loadBrandingSettingsForm(),
    getImageUploadLimits(),
  ]);
  const canUpdate = hasPermission(admin, "branding.update");

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Logo & Branding"
        description="Manage your logo, favicon and brand identity."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Logo & Branding" },
        ]}
      />
      <BrandingSettingsForm
        initialValues={values}
        initialPreviewUrls={previewUrls}
        canUpdate={canUpdate}
        adminImageMaxMb={limits.adminImageMaxMb}
      />
    </div>
  );
}
