import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { BannersManager } from "@/features/cms/components/BannersManager";
import { listAdminBanners } from "@/features/cms/banners-service";

export const dynamic = "force-dynamic";

export default async function AdminContentBannersPage() {
  const admin = await requirePermission("content.view");
  const banners = await listAdminBanners();

  return (
    <div className="space-y-4 pb-16">
      <AdminPageHeader
        title="Banners"
        description="Promotional banners shown across your store."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Banners" },
        ]}
      />
      <BannersManager
        initialBanners={banners}
        canCreate={hasPermission(admin, "content.create")}
        canUpdate={hasPermission(admin, "content.update")}
        canDelete={hasPermission(admin, "content.delete")}
      />
    </div>
  );
}
