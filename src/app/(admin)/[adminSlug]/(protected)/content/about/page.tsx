import Alert from "@mui/material/Alert";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { HomepageBuilder } from "@/features/cms/components/HomepageBuilder";
import { getOrCreateAboutPage } from "@/features/cms/pages-service";
import { listPageSections } from "@/features/cms/sections-service";

export const dynamic = "force-dynamic";

export default async function AdminContentAboutPage() {
  const admin = await requirePermission("content.view");
  const page = await getOrCreateAboutPage();

  if (!page) {
    return (
      <div>
        <AdminPageHeader
          title="About"
          breadcrumbs={[
            { label: "Content", href: getAdminPath("/content") },
            { label: "About" },
          ]}
        />
        <Alert severity="error">Unable to load the about page for this store.</Alert>
      </div>
    );
  }

  const sections = await listPageSections(page.id);

  return (
    <div className="space-y-4 pb-16">
      <AdminPageHeader
        title="About"
        description="Build the /about page — add an About section for the founder story (heading, quote, portrait, timeline)."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "About" },
        ]}
      />
      <HomepageBuilder
        page={page}
        initialSections={sections}
        pageLabel="About page"
        canCreate={hasPermission(admin, "content.create")}
        canUpdate={hasPermission(admin, "content.update")}
        canDelete={hasPermission(admin, "content.delete")}
        canPublish={hasPermission(admin, "content.publish")}
      />
    </div>
  );
}
