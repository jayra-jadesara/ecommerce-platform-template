import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/features/catalog/components/ProductForm";
import { listAdminCategories } from "@/features/catalog/categories-service";
import {
  getAdminProduct,
  toProductFormValues,
} from "@/features/catalog/products-service";
import { ProductImagesPanel } from "@/features/media/components/ProductImagesPanel";
import { listProductImages } from "@/features/media/product-images-service";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

export const dynamic = "force-dynamic";

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requirePermission("products.view");
  const { id } = await params;
  const [detail, categories, images] = await Promise.all([
    getAdminProduct(id),
    listAdminCategories(),
    listProductImages(id),
  ]);
  if (!detail) notFound();

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
        {detail.product.name}
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Edit product
      </h1>
      <ProductForm
        mode="edit"
        productId={detail.product.id}
        initialValues={toProductFormValues(detail)}
        categories={categories}
        canUpdate={hasPermission(admin, "products.update")}
        canDelete={hasPermission(admin, "products.delete")}
      />
      <ProductImagesPanel
        productId={detail.product.id}
        initialImages={images}
        canUpload={hasPermission(admin, "product_images.upload")}
        canUpdate={hasPermission(admin, "product_images.update")}
        canDelete={hasPermission(admin, "product_images.delete")}
      />
    </div>
  );
}
