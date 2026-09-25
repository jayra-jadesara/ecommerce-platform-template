import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import {
  BrochuresManager,
  type BrochuresTab,
} from "@/features/brochure/components/BrochuresManager";
import {
  getBrochurePageDescription,
  listAdminBrochures,
} from "@/features/brochure/service";
import { getImageUploadLimits } from "@/features/media/upload-limits.server";

export const dynamic = "force-dynamic";

function parseTab(value: string | undefined): BrochuresTab {
  return value === "create" ? "create" : "list";
}

export default async function AdminContentBrochuresPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const admin = await requirePermission("content.view");
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const canCreate = hasPermission(admin, "content.create");
  const activeTab: BrochuresTab =
    tab === "create" && !canCreate ? "list" : tab;

  const [brochures, limits, pageDescription] = await Promise.all([
    listAdminBrochures(),
    getImageUploadLimits(),
    getBrochurePageDescription(),
  ]);

  const base = getAdminPath("/content/brochures");

  return (
    <div className="space-y-4 pb-16">
      <AdminPageHeader
        title="Brochures"
        description="PDFs customers can download on the storefront brochure page."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Brochures" },
        ]}
      />
      <BrochuresManager
        initialBrochures={brochures}
        adminBrochurePdfMaxMb={limits.adminBrochurePdfMaxMb}
        pageDescription={pageDescription}
        canCreate={canCreate}
        canUpdate={hasPermission(admin, "content.update")}
        canDelete={hasPermission(admin, "content.delete")}
        tab={activeTab}
        listHref={`${base}?tab=list`}
        createHref={`${base}?tab=create`}
      />
    </div>
  );
}
