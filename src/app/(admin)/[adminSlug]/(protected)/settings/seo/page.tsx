import { SeoSettingsForm } from "@/features/admin/settings/components/SeoSettingsForm";
import { loadSeoSettingsForm } from "@/features/admin/settings/load-forms";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminSeoSettingsPage() {
  const admin = await requirePermission("seo.view");
  const { values } = await loadSeoSettingsForm();
  const canUpdate = hasPermission(admin, "seo.update");

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Google & SEO"
        description="Control how your store appears in Google and when shared online."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Google & SEO" },
        ]}
      />
      <SeoSettingsForm initialValues={values} canUpdate={canUpdate} />
    </div>
  );
}
