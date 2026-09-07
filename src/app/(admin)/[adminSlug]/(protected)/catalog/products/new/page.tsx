import Link from "next/link";
import { ProductForm } from "@/features/catalog/components/ProductForm";
import { listAdminCategories } from "@/features/catalog/categories-service";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

export const dynamic = "force-dynamic";

export default async function AdminNewProductPage() {
  const admin = await requirePermission("products.create");
  const categories = await listAdminCategories();

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        <Link
          href={getAdminPath("/catalog/products")}
          className="text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Products
        </Link>
        <span aria-hidden> / </span>
        New
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        New product
      </h1>
      <ProductForm
        mode="create"
        categories={categories}
        canUpdate={hasPermission(admin, "products.create")}
        canDelete={false}
      />
      <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-muted)]">
        Save the product first, then upload images from the product editor.
      </p>
    </div>
  );
}
