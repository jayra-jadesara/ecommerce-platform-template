import Link from "next/link";
import { ProductListTable } from "@/features/catalog/components/ProductListTable";
import { listAdminCategories } from "@/features/catalog/categories-service";
import { listAdminProducts } from "@/features/catalog/products-service";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

export const dynamic = "force-dynamic";

export default async function AdminCatalogProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requirePermission("products.view");
  const params = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && value[0]) flat[key] = value[0];
  }

  const [list, categories] = await Promise.all([
    listAdminProducts(flat),
    listAdminCategories(),
  ]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        <Link
          href={getAdminPath("/catalog/categories")}
          className="text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Categories
        </Link>
        <span aria-hidden> · </span>
        Products
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Products
      </h1>
      <ProductListTable
        items={list.items}
        total={list.total}
        query={list.query}
        categories={categories}
        canCreate={hasPermission(admin, "products.create")}
      />
    </div>
  );
}
