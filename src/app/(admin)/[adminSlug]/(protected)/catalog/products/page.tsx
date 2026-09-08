import Link from "next/link";
import Alert from "@mui/material/Alert";
import { notFound } from "next/navigation";
import { ProductListTable } from "@/features/catalog/components/ProductListTable";
import { ProductForm } from "@/features/catalog/components/ProductForm";
import { listAdminCategories } from "@/features/catalog/categories-service";
import {
  getAdminProduct,
  listAdminProducts,
  toProductFormValues,
} from "@/features/catalog/products-service";
import { ProductImagesPanel } from "@/features/media/components/ProductImagesPanel";
import { listProductImages } from "@/features/media/product-images-service";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";

export const dynamic = "force-dynamic";

type Panel = "list" | "new" | "edit" | "view";

function parsePanel(value: string | undefined): Panel {
  if (value === "new" || value === "edit" || value === "view") return value;
  return "list";
}

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

  const panel = parsePanel(flat.panel);
  const productId = flat.id;
  const listHref = getAdminPath("/catalog/products");

  const canCreate = hasPermission(admin, "products.create");
  const canUpdate = hasPermission(admin, "products.update");
  const canDelete = hasPermission(admin, "products.delete");

  if (panel === "new") {
    if (!canCreate) {
      return (
        <div className="space-y-4">
          <AdminPageHeader
            title="Add Product"
            description="You don’t have permission to create products."
            breadcrumbs={[
              { label: "Products", href: listHref },
              { label: "Add Product" },
            ]}
          />
          <Alert severity="warning">
            Ask a store admin for product create access.{" "}
            <Link href={listHref} className="underline underline-offset-2">
              Back to products
            </Link>
          </Alert>
        </div>
      );
    }

    const [categories, storeId] = await Promise.all([
      listAdminCategories(),
      resolveActiveStoreId(),
    ]);

    return (
      <div className="space-y-4 pb-24">
        <AdminPageHeader
          title="Add Product"
          description="Name it, set a price, save — then add photos."
          breadcrumbs={[
            { label: "Products", href: listHref },
            { label: "Add Product" },
          ]}
        />
        {!storeId ? (
          <Alert severity="warning">
            Your store isn&apos;t set up yet, so products can&apos;t be saved.{" "}
            <Link
              href={getAdminPath("/settings/general")}
              className="font-medium underline underline-offset-2"
            >
              Open Store Information
            </Link>
          </Alert>
        ) : null}
        <ProductForm
          mode="create"
          categories={categories}
          canUpdate={canCreate}
          canDelete={false}
        />
      </div>
    );
  }

  if (panel === "edit" || panel === "view") {
    if (!productId) notFound();
    const [detail, categories, images] = await Promise.all([
      getAdminProduct(productId),
      listAdminCategories(),
      listProductImages(productId),
    ]);
    if (!detail) notFound();

    const isView = panel === "view";

    return (
      <div className="space-y-8 pb-24">
        <AdminPageHeader
          title={detail.product.name}
          description={
            isView
              ? "Product details (view only)."
              : "Update details, pricing, images and visibility."
          }
          breadcrumbs={[
            { label: "Products", href: listHref },
            { label: detail.product.name },
          ]}
        />
        <ProductForm
          mode={isView ? "view" : "edit"}
          productId={detail.product.id}
          initialValues={toProductFormValues(detail)}
          categories={categories}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
        {!isView ? (
          <section className="space-y-3">
            <ProductImagesPanel
              productId={detail.product.id}
              initialImages={images}
              canUpload={hasPermission(admin, "product_images.upload")}
              canUpdate={hasPermission(admin, "product_images.update")}
              canDelete={hasPermission(admin, "product_images.delete")}
            />
          </section>
        ) : images.length > 0 ? (
          <section className="space-y-3 pb-4">
            <ProductImagesPanel
              productId={detail.product.id}
              initialImages={images}
              canUpload={false}
              canUpdate={false}
              canDelete={false}
            />
          </section>
        ) : null}
      </div>
    );
  }

  const [list, categories] = await Promise.all([
    listAdminProducts(flat),
    listAdminCategories(),
  ]);

  return (
    <div className="flex flex-1 flex-col space-y-4">
      <AdminPageHeader
        title="Products"
        description="View, add, edit, or delete products from one place."
        breadcrumbs={[
          { label: "Products", href: listHref },
          { label: "All Products" },
        ]}
      />
      <ProductListTable
        items={list.items}
        total={list.total}
        query={list.query}
        categories={categories}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
