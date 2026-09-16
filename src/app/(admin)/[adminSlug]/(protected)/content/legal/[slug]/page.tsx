import Alert from "@mui/material/Alert";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { LegalPageForm } from "@/features/cms/components/LegalPageForm";
import {
  getOrCreateLegalPage,
  toPageFormValues,
} from "@/features/cms/pages-service";
import {
  isLegalPageSlug,
  LEGAL_PAGE_META,
  type LegalPageSlug,
} from "@/features/cms/schemas";

export const dynamic = "force-dynamic";

export default async function AdminLegalPageEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const admin = await requirePermission("content.view");
  const { slug: rawSlug } = await params;
  if (!isLegalPageSlug(rawSlug)) notFound();
  const slug = rawSlug as LegalPageSlug;
  const meta = LEGAL_PAGE_META[slug];

  const page = await getOrCreateLegalPage(slug);
  if (!page) {
    return (
      <div className="space-y-4">
        <AdminPageHeader
          title={meta.title}
          breadcrumbs={[
            { label: "Content", href: getAdminPath("/content") },
            { label: "Legal pages", href: getAdminPath("/content/legal") },
            { label: meta.title },
          ]}
        />
        <Alert severity="error">
          Unable to load this legal page for the active store.
        </Alert>
      </div>
    );
  }

  const canUpdate = hasPermission(admin, "content.update");

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={meta.title}
        description={meta.description}
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Legal pages", href: getAdminPath("/content/legal") },
          { label: meta.title },
        ]}
      />
      {!canUpdate ? (
        <Alert severity="info">
          You can view this page but do not have permission to save changes.
        </Alert>
      ) : null}
      <LegalPageForm
        pageId={page.id}
        slug={slug}
        initialValues={toPageFormValues(page)}
        canSubmit={canUpdate}
      />
    </div>
  );
}
