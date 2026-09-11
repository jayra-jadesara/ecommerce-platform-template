"use server";

import { getAdminPath } from "@/config/admin-route";
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

const MEDIA_ROUTE = getAdminPath("/media");
const PRODUCTS_ROUTE = getAdminPath("/catalog/products");

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
