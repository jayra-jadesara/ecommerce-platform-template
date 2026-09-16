import Alert from "@mui/material/Alert";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AboutPageForm } from "@/features/cms/components/AboutPageForm";
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
  const aboutSection = sections.find((s) => s.sectionType === "about") ?? null;

  if (!aboutSection) {
    return (
      <div className="space-y-4 pb-16">
        <AdminPageHeader
          title="About"
          description="Edit the /about page for shoppers — founder story, portrait, and optional heritage train milestones."
          breadcrumbs={[
            { label: "Content", href: getAdminPath("/content") },
            { label: "About" },
          ]}
        />
        <Alert severity="error">
          About content is missing. Refresh the page, or contact support if this
          keeps happening.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      <AdminPageHeader
        title="About"
        description="Edit the /about page for shoppers — founder story, portrait, and optional heritage train milestones."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "About" },
        ]}
      />
      <AboutPageForm
        page={page}
        section={aboutSection}
        canUpdate={hasPermission(admin, "content.update")}
        canPublish={hasPermission(admin, "content.publish")}
      />
    </div>
  );
}
