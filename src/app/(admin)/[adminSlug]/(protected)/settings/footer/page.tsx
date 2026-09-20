import { FooterSettingsForm } from "@/features/admin/settings/components/FooterSettingsForm";
import { loadFooterSettingsForm } from "@/features/admin/settings/load-forms";
import { requirePermission, hasPermission } from "@/features/auth/session";
import {
  getStoreBranding,
  getStoreContact,
} from "@/features/theme/service";
import { listBlogProductOptions } from "@/features/blog/posts-service";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminFooterSettingsPage() {
  const admin = await requirePermission("settings.view");
  const [values, brand, contact, productOptions] = await Promise.all([
    loadFooterSettingsForm(),
    getStoreBranding(),
    getStoreContact(),
    listBlogProductOptions(),
  ]);
  const canUpdate = hasPermission(admin, "settings.update");

  return (
    <div className="space-y-3">
      <AdminPageHeader
        title="Footer layout"
        description="Turn blocks on or off. Preview matches the live store footer."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Footer layout" },
        ]}
      />
      <FooterSettingsForm
        initialValues={values}
        brand={brand}
        contact={contact}
        canUpdate={canUpdate}
        productOptions={productOptions}
      />
    </div>
  );
}
