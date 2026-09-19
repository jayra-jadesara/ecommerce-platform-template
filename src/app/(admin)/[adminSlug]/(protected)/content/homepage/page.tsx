import Alert from "@mui/material/Alert";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { HomepageBuilder } from "@/features/cms/components/HomepageBuilder";
import { getOrCreateHomepagePage } from "@/features/cms/pages-service";
import {
  listPageSections,
  migrateHomepageAboutToOtherInformation,
} from "@/features/cms/sections-service";
import {
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/features/catalog/storefront";

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

  if (hasPermission(admin, "content.update")) {
    await migrateHomepageAboutToOtherInformation(page.id);
  }
  const [sections, categories, productsResult] = await Promise.all([
    listPageSections(page.id),
    listStorefrontCategories(),
    listStorefrontProducts({
      pageSize: 100,
      sort: "name",
      page: 1,
    }),
  ]);

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    label: c.name,
  }));

  const productOptions = productsResult.items.map((p) => ({
    id: p.id,
    label: p.categoryName ? `${p.name} · ${p.categoryName}` : p.name,
  }));

  return (
    <div className="space-y-4 pb-16">
      <AdminPageHeader
        title="Homepage"
        description="Build the sections of your storefront."
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
        categoryOptions={categoryOptions}
        productOptions={productOptions}
      />
    </div>
  );
}
