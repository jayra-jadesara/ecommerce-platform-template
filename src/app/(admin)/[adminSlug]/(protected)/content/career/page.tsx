import Alert from "@mui/material/Alert";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { CareerPageForm } from "@/features/career/components/CareerPageForm";
import {
  listAdminCareerApplications,
  listAdminJobPosts,
} from "@/features/career/service";
import { getOrCreateCareerPage } from "@/features/cms/pages-service";
import { listPageSections } from "@/features/cms/sections-service";

export const dynamic = "force-dynamic";

export default async function AdminContentCareerPage() {
  const admin = await requirePermission("content.view");
  const page = await getOrCreateCareerPage();

  if (!page) {
    return (
      <div>
        <AdminPageHeader
          title="Career"
          breadcrumbs={[
            { label: "Content", href: getAdminPath("/content") },
            { label: "Career" },
          ]}
        />
        <Alert severity="error">
          Unable to load the career page for this store.
        </Alert>
      </div>
    );
  }

  const [sections, jobs, applications] = await Promise.all([
    listPageSections(page.id),
    listAdminJobPosts(),
    listAdminCareerApplications(),
  ]);
  const careerSection =
    sections.find((s) => s.sectionType === "career") ?? null;

  const pageName = page.title?.trim() || "Career";

  if (!careerSection) {
    return (
      <div className="space-y-4 pb-16">
        <AdminPageHeader
          title={pageName}
          description="Manage careers intro, open roles, and applications (no CV uploads)."
          breadcrumbs={[
            { label: "Content", href: getAdminPath("/content") },
            { label: pageName },
          ]}
        />
        <Alert severity="error">
          Career content is missing. Refresh the page, or contact support if
          this keeps happening.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      <AdminPageHeader
        title={pageName}
        description="Heading sets the page name everywhere. Unpublish to hide roles and the apply form on the store."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: pageName },
        ]}
      />
      <CareerPageForm
        page={page}
        section={careerSection}
        jobs={jobs}
        applications={applications}
        canUpdate={hasPermission(admin, "content.update")}
        canPublish={hasPermission(admin, "content.publish")}
      />
    </div>
  );
}
