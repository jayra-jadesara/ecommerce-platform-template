import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";

export type CategoryDependencies = {
  productCount: number;
  childCount: number;
  canDelete: boolean;
  message: string;
  suggestion: "deactivate" | null;
};

export type ProductDependencies = {
  orderItemCount: number;
  canDelete: boolean;
  message: string;
  suggestion: "archive" | null;
};

export type MediaDependencies = {
  productImageCount: number;
  categoryCount: number;
  canDelete: boolean;
  message: string;
};

export async function checkCategoryDependencies(
  categoryId: string,
): Promise<CategoryDependencies | null> {
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return null;

  const [{ count: productCount }, { count: childCount }] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("category_id", categoryId),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("parent_id", categoryId),
  ]);

  const products = productCount ?? 0;
  const children = childCount ?? 0;
  const canDelete = products === 0 && children === 0;

  let message = "This category can be deleted.";
  if (!canDelete) {
    const parts: string[] = [];
    if (products > 0) {
      parts.push(
        products === 1
          ? "1 product"
          : `${products} products`,
      );
    }
    if (children > 0) {
      parts.push(
        children === 1
          ? "1 subcategory"
          : `${children} subcategories`,
      );
    }
    message = `This category is currently used by ${parts.join(" and ")}. Deactivate it instead to keep your catalog safe.`;
  }

  return {
    productCount: products,
    childCount: children,
    canDelete,
    message,
    suggestion: canDelete ? null : "deactivate",
  };
}

export async function checkProductDependencies(
  productId: string,
): Promise<ProductDependencies | null> {
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return null;

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);

  const variantIds = (variants ?? []).map((v) => v.id as string);

  let orderItemCount = 0;
  if (variantIds.length > 0) {
    const { count } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .in("variant_id", variantIds);
    orderItemCount = count ?? 0;
  }

  // Also count rows that still point at the product id directly.
  const { count: byProduct } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  orderItemCount += byProduct ?? 0;

  const canDelete = orderItemCount === 0;
  const message = canDelete
    ? "This product can be deleted."
    : `This product appears in ${orderItemCount} order line${orderItemCount === 1 ? "" : "s"}. Archive it instead so order history stays intact.`;

  return {
    orderItemCount,
    canDelete,
    message,
    suggestion: canDelete ? null : "archive",
  };
}

export async function checkMediaDependencies(
  storagePath: string,
): Promise<MediaDependencies | null> {
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return null;

  const [{ count: productImageCount }, { count: categoryCount }] =
    await Promise.all([
      supabase
        .from("product_images")
        .select("id", { count: "exact", head: true })
        .eq("storage_path", storagePath),
      supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("image_path", storagePath),
    ]);

  const products = productImageCount ?? 0;
  const categories = categoryCount ?? 0;
  const canDelete = products === 0 && categories === 0;

  let message = "This file can be deleted.";
  if (!canDelete) {
    const parts: string[] = [];
    if (products > 0) parts.push("products");
    if (categories > 0) parts.push("categories");
    message = `Can't delete this file because it is still used by ${parts.join(" and ")}.`;
  }

  return {
    productImageCount: products,
    categoryCount: categories,
    canDelete,
    message,
  };
}
