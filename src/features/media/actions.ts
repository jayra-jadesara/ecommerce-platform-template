"use server";

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

export async function uploadMediaAction(formData: FormData) {
  return uploadMedia(formData);
}

export async function deleteMediaAction(id: string) {
  return deleteMedia(id);
}

export async function updateMediaMetaAction(
  id: string,
  input: { altText?: string | null },
) {
  return updateMediaMeta(id, input);
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
  return createProductImage(productId, formData);
}

export async function deleteProductImageAction(imageId: string) {
  return deleteProductImage(imageId);
}

export async function setPrimaryProductImageAction(imageId: string) {
  return setPrimaryProductImage(imageId);
}

export async function reorderProductImagesAction(
  productId: string,
  orderedIds: string[],
) {
  return reorderProductImages(productId, orderedIds);
}

export async function updateProductImageAltAction(
  imageId: string,
  altText: string,
) {
  return updateProductImageAlt(imageId, altText);
}
