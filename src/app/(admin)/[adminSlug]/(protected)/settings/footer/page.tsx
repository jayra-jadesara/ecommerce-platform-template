import { FooterSettingsForm } from "@/features/admin/settings/components/FooterSettingsForm";
import { loadFooterSettingsForm } from "@/features/admin/settings/load-forms";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getStoreBranding } from "@/features/theme/service";
import { listBlogProductOptions } from "@/features/blog/posts-service";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminFooterSettingsPage() {
  const admin = await requirePermission("settings.view");
  const [values, brand, productOptions] = await Promise.all([
    loadFooterSettingsForm(),
    getStoreBranding(),
    listBlogProductOptions(),
  ]);
  const canUpdate = hasPermission(admin, "settings.update");

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Footer layout"
        description="What to show in the footer. Description and copyright fill in automatically. Optionally highlight a product above the footer."
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
        productOptions={productOptions}
      />
    </div>
  );
}
