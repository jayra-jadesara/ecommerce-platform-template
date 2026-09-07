"use server";

import {
  archiveCategory,
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/features/catalog/categories-service";
import {
  archiveProduct,
  createProduct,
  deleteProduct,
  updateInventory,
  updateProduct,
} from "@/features/catalog/products-service";

export async function createCategoryAction(input: unknown) {
  return createCategory(input);
}

export async function updateCategoryAction(id: string, input: unknown) {
  return updateCategory(id, input);
}

export async function archiveCategoryAction(id: string) {
  return archiveCategory(id);
}

export async function deleteCategoryAction(id: string) {
  return deleteCategory(id);
}

export async function createProductAction(input: unknown) {
  return createProduct(input);
}

export async function updateProductAction(id: string, input: unknown) {
  return updateProduct(id, input);
}

export async function archiveProductAction(id: string) {
  return archiveProduct(id);
}

export async function deleteProductAction(id: string) {
  return deleteProduct(id);
}

export async function updateInventoryAction(input: unknown) {
  return updateInventory(input);
}
