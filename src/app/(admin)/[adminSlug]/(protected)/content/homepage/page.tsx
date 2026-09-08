import Alert from "@mui/material/Alert";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { HomepageBuilder } from "@/features/cms/components/HomepageBuilder";
import { getOrCreateHomepagePage } from "@/features/cms/pages-service";
import { listPageSections } from "@/features/cms/sections-service";

export const dynamic = "force-dynamic";

export default async function AdminContentHomepagePage() {
  const admin = await requirePermission("content.view");
  const page = await getOrCreateHomepagePage();

  if (!page) {
    return (
      <div>
        <AdminPageHeader
          title="Homepage"
          breadcrumbs={[
            { label: "Content", href: getAdminPath("/content") },
            { label: "Homepage" },
          ]}
        />
        <Alert severity="error">Unable to load the homepage for this store.</Alert>
      </div>
    );
  }

  const sections = await listPageSections(page.id);

  return (
    <div className="space-y-4 pb-16">
      <AdminPageHeader
        title="Homepage"
        description="Arrange and edit the sections customers see first."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Homepage" },
        ]}
      />
      <HomepageBuilder
        page={page}
        initialSections={sections}
        canCreate={hasPermission(admin, "content.create")}
        canUpdate={hasPermission(admin, "content.update")}
        canDelete={hasPermission(admin, "content.delete")}
        canPublish={hasPermission(admin, "content.publish")}
      />
    </div>
  );
}
