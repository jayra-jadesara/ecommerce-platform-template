import Link from "next/link";
import { CategoryManager } from "@/features/catalog/components/CategoryManager";
import { listAdminCategories } from "@/features/catalog/categories-service";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const admin = await requirePermission("categories.view");
  const categories = await listAdminCategories();

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        <Link
          href={getAdminPath("/catalog/products")}
          className="text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Catalog
        </Link>
        <span aria-hidden> / </span>
        Categories
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Categories
      </h1>
      <p className="text-sm text-[var(--color-muted)]">
        Hierarchical categories scoped to the active store. Prefer deactivate
        over delete when products still reference a category.
      </p>
      <CategoryManager
        initialCategories={categories}
        canCreate={hasPermission(admin, "categories.create")}
        canUpdate={hasPermission(admin, "categories.update")}
        canDelete={hasPermission(admin, "categories.delete")}
      />
    </div>
  );
}
