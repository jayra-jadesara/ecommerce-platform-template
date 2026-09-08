import { EmptyState } from "@/components/ui/EmptyState";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { requirePermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

export default async function AdminContentBannersPage() {
  await requirePermission("cms.view");

  return (
    <div>
      <AdminPageHeader
        title="Banners"
        description="Promotional banners and seasonal announcements for your store."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Banners" },
        ]}
      />
      <EmptyState
        title="No banners yet"
        description="Banner management will be available in a later update."
      />
    </div>
  );
}
