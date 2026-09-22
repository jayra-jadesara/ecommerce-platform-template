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
import { getImageUploadLimits } from "@/features/media/upload-limits.server";
import { listAdminSizeOptions } from "@/features/catalog/size-options-service";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { loadShippingSettingsForm } from "@/features/admin/settings/update-shipping-payment";
import { isReturnPolicy } from "@/features/shipping/policies";

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

    const [categories, sizeOptions, storeId, shipping] = await Promise.all([
      listAdminCategories(),
      listAdminSizeOptions({ activeOnly: true }),
      resolveActiveStoreId(),
      loadShippingSettingsForm(),
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
          sizeOptions={sizeOptions}
          canUpdate={canCreate}
          canDelete={false}
          storeReturnPolicy={
            isReturnPolicy(shipping.values.returnPolicy)
              ? shipping.values.returnPolicy
              : "no_return_refund"
          }
        />
      </div>
    );
  }

  if (panel === "edit" || panel === "view") {
    if (!productId) notFound();
    const [detail, categories, sizeOptions, images, shipping, limits] =
      await Promise.all([
        getAdminProduct(productId),
        listAdminCategories(),
        listAdminSizeOptions({ activeOnly: true }),
        listProductImages(productId),
        loadShippingSettingsForm(),
        getImageUploadLimits(),
      ]);
    if (!detail) notFound();

    const isView = panel === "view";
    const storeReturnPolicy = isReturnPolicy(shipping.values.returnPolicy)
      ? shipping.values.returnPolicy
      : "no_return_refund";

    return (
      <div className="space-y-3 pb-24">
        <AdminPageHeader
          title={detail.product.name}
          description={
            isView ? "View product details." : "Edit details, price, and visibility."
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
          sizeOptions={sizeOptions}
          canUpdate={canUpdate}
          canDelete={canDelete}
          storeReturnPolicy={storeReturnPolicy}
          showStockHint={flat.stockHint === "1"}
          imagesSlot={
            !isView || images.length > 0 ? (
              <ProductImagesPanel
                productId={detail.product.id}
                initialImages={images}
                canUpload={
                  !isView && hasPermission(admin, "product_images.upload")
                }
                canUpdate={
                  !isView && hasPermission(admin, "product_images.update")
                }
                canDelete={
                  !isView && hasPermission(admin, "product_images.delete")
                }
                adminImageMaxMb={limits.adminImageMaxMb}
                embedded
              />
            ) : null
          }
        />
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
        description="Everything you sell — search, filter, and edit products."
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
