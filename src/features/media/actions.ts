"use server";

import { getAdminPath } from "@/config/admin-route";
import { checkMediaDependencies } from "@/features/admin/validation/dependencies";
import {
  deleteMedia,
  listMedia,
  updateMediaMeta,
  uploadMedia,
} from "@/features/media/media-service";
import {
  createProductImage,
  deleteProductImage,
  listProductImages,
  reorderProductImages,
  setPrimaryProductImage,
  updateProductImageAlt,
} from "@/features/media/product-images-service";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";

const MEDIA_ROUTE = getAdminPath("/media");
const PRODUCTS_ROUTE = getAdminPath("/catalog/products");

export async function checkMediaDependenciesAction(id: string) {
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return { ok: false as const, error: "Unable to check media usage." };
  }
  const { data: row } = await supabase
    .from("media")
    .select("storage_path")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!row?.storage_path) {
    return { ok: false as const, error: "Media item not found." };
  }
  const deps = await checkMediaDependencies(row.storage_path as string);
  if (!deps) {
    return { ok: false as const, error: "Unable to check media usage." };
  }
  return { ok: true as const, deps };
}

export async function uploadMediaAction(formData: FormData) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "MEDIA_UPLOAD",
      feature: "MEDIA",
      route: MEDIA_ROUTE,
    },
    () => uploadMedia(formData),
  );
}

export async function deleteMediaAction(id: string) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "MEDIA_DELETE",
      feature: "MEDIA",
      entityType: "media",
      entityId: id,
      route: MEDIA_ROUTE,
    },
    () => deleteMedia(id),
  );
}

export async function updateMediaMetaAction(
  id: string,
  input: { altText?: string | null },
) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "MEDIA_UPDATE",
      feature: "MEDIA",
      entityType: "media",
      entityId: id,
      route: MEDIA_ROUTE,
    },
    () => updateMediaMeta(id, input),
  );
}

export async function listMediaAction(
  query: Parameters<typeof listMedia>[0],
) {
  return listMedia(query);
}

export async function listProductImagesAction(productId: string) {
  return listProductImages(productId);
}

export async function uploadProductImageAction(
  productId: string,
  formData: FormData,
) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "PRODUCT_IMAGE_UPLOAD",
      feature: "MEDIA",
      entityType: "products",
      entityId: productId,
      route: PRODUCTS_ROUTE,
    },
    () => createProductImage(productId, formData),
  );
}

export async function deleteProductImageAction(imageId: string) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "PRODUCT_IMAGE_DELETE",
      feature: "MEDIA",
      entityType: "product_images",
      entityId: imageId,
      route: PRODUCTS_ROUTE,
    },
    () => deleteProductImage(imageId),
  );
}

export async function setPrimaryProductImageAction(imageId: string) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "PRODUCT_IMAGE_UPDATE",
      feature: "MEDIA",
      entityType: "product_images",
      entityId: imageId,
      route: PRODUCTS_ROUTE,
    },
    () => setPrimaryProductImage(imageId),
  );
}

export async function reorderProductImagesAction(
  productId: string,
  orderedIds: string[],
) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "PRODUCT_IMAGE_UPDATE",
      feature: "MEDIA",
      entityType: "products",
      entityId: productId,
      route: PRODUCTS_ROUTE,
    },
    () => reorderProductImages(productId, orderedIds),
  );
}

export async function updateProductImageAltAction(
  imageId: string,
  altText: string,
) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "PRODUCT_IMAGE_UPDATE",
      feature: "MEDIA",
      entityType: "product_images",
      entityId: imageId,
      route: PRODUCTS_ROUTE,
    },
    () => updateProductImageAlt(imageId, altText),
  );
}
