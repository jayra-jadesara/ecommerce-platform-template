import { CategoryManager } from "@/features/catalog/components/CategoryManager";
import { listAdminCategories } from "@/features/catalog/categories-service";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const admin = await requirePermission("categories.view");
  const categories = await listAdminCategories();

  return (
    <div className="w-full min-w-0 space-y-3">
      <AdminPageHeader
        title="Categories"
        description="Organize products into categories customers can browse."
        breadcrumbs={[
          { label: "Products", href: getAdminPath("/catalog/products") },
          { label: "Categories" },
        ]}
      />
      <CategoryManager
        initialCategories={categories}
        canCreate={hasPermission(admin, "categories.create")}
        canUpdate={hasPermission(admin, "categories.update")}
        canDelete={hasPermission(admin, "categories.delete")}
      />
    </div>
  );
}
