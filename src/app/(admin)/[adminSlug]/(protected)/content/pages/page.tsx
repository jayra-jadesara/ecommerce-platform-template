import Link from "next/link";
import Alert from "@mui/material/Alert";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { PageForm } from "@/features/cms/components/PageForm";
import { PagesListClient } from "@/features/cms/components/PagesListClient";
import {
  getAdminPage,
  listAdminPages,
  toPageFormValues,
} from "@/features/cms/pages-service";
import type { PageFormValues } from "@/features/cms/schemas";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE: PageFormValues = {
  title: "",
  slug: "",
  content: null,
  featuredImagePath: null,
  seoTitle: null,
  seoDescription: null,
  ogImagePath: null,
  status: "draft",
};

export default async function AdminContentPagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requirePermission("content.view");
  const params = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && value[0]) flat[key] = value[0];
  }

  const panel = flat.panel === "new" || flat.panel === "edit" ? flat.panel : "list";
  const listHref = getAdminPath("/content/pages");
  const canCreate = hasPermission(admin, "content.create");
  const canUpdate = hasPermission(admin, "content.update");
  const canPublish = hasPermission(admin, "content.publish");
  const canDelete = hasPermission(admin, "content.delete");

  if (panel === "new") {
    if (!canCreate) {
      return (
        <div className="space-y-4">
          <AdminPageHeader title="Create page" />
          <Alert severity="warning">
            You don’t have permission to create pages.{" "}
            <Link href={listHref} className="underline">
              Back
            </Link>
          </Alert>
        </div>
      );
    }
    return (
      <div className="space-y-4 pb-16">
        <AdminPageHeader
          title="Create page"
          description="Add a storefront page such as About or Shipping."
          breadcrumbs={[
            { label: "Content", href: getAdminPath("/content") },
            { label: "Pages", href: listHref },
            { label: "Create" },
          ]}
        />
        <PageForm mode="create" initialValues={DEFAULT_PAGE} canSubmit={canCreate} />
      </div>
    );
  }

  if (panel === "edit") {
    if (!canUpdate) {
      return (
        <div className="space-y-4">
          <AdminPageHeader title="Edit page" />
          <Alert severity="warning">You don’t have permission to edit pages.</Alert>
        </div>
      );
    }
    const page = flat.id ? await getAdminPage(flat.id) : null;
    if (!page) {
      return (
        <div className="space-y-4">
          <AdminPageHeader title="Edit page" />
          <Alert severity="error">
            Page not found.{" "}
            <Link href={listHref} className="underline">
              Back
            </Link>
          </Alert>
        </div>
      );
    }
    return (
      <div className="space-y-4 pb-16">
        <AdminPageHeader
          title={`Edit ${page.title}`}
          breadcrumbs={[
            { label: "Content", href: getAdminPath("/content") },
            { label: "Pages", href: listHref },
            { label: page.title },
          ]}
        />
        <PageForm
          mode="edit"
          pageId={page.id}
          initialValues={toPageFormValues(page)}
          canSubmit={canUpdate}
        />
      </div>
    );
  }

  const pages = await listAdminPages();

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Pages"
        description="Create and publish store pages customers can visit."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Pages" },
        ]}
      />
      <PagesListClient
        pages={pages}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canPublish={canPublish}
        canDelete={canDelete}
      />
    </div>
  );
}
