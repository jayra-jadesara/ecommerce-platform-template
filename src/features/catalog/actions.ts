"use server";

import { getAdminPath } from "@/config/admin-route";
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
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";
import {
  checkCategoryDependencies,
  checkProductDependencies,
} from "@/features/admin/validation/dependencies";

const PRODUCTS_ROUTE = getAdminPath("/catalog/products");
const CATEGORIES_ROUTE = getAdminPath("/catalog/categories");

export async function checkCategoryDependenciesAction(id: string) {
  const deps = await checkCategoryDependencies(id);
  if (!deps) {
    return { ok: false as const, error: "Unable to check category usage." };
  }
  return { ok: true as const, deps };
}

export async function checkProductDependenciesAction(id: string) {
  const deps = await checkProductDependencies(id);
  if (!deps) {
    return { ok: false as const, error: "Unable to check product usage." };
  }
  return { ok: true as const, deps };
}

export async function createCategoryAction(input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "CREATE_CATEGORY",
      feature: "CATEGORIES",
      route: CATEGORIES_ROUTE,
    },
    () => createCategory(input),
  );
}

export async function updateCategoryAction(id: string, input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "UPDATE_CATEGORY",
      feature: "CATEGORIES",
      entityType: "categories",
      entityId: id,
      route: CATEGORIES_ROUTE,
    },
    () => updateCategory(id, input),
  );
}

export async function archiveCategoryAction(id: string) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "DISABLE_CATEGORY",
      feature: "CATEGORIES",
      entityType: "categories",
      entityId: id,
      route: CATEGORIES_ROUTE,
    },
    () => archiveCategory(id),
  );
}

export async function deleteCategoryAction(id: string) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "DELETE_CATEGORY",
      feature: "CATEGORIES",
      entityType: "categories",
      entityId: id,
      route: CATEGORIES_ROUTE,
    },
    () => deleteCategory(id),
  );
}

export async function createProductAction(input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "CREATE_PRODUCT",
      feature: "PRODUCTS",
      route: PRODUCTS_ROUTE,
    },
    () => createProduct(input),
  );
}

export async function updateProductAction(id: string, input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "UPDATE_PRODUCT",
      feature: "PRODUCTS",
      entityType: "products",
      entityId: id,
      route: PRODUCTS_ROUTE,
    },
    () => updateProduct(id, input),
  );
}

export async function archiveProductAction(id: string) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "ARCHIVE_PRODUCT",
      feature: "PRODUCTS",
      entityType: "products",
      entityId: id,
      route: PRODUCTS_ROUTE,
    },
    () => archiveProduct(id),
  );
}

export async function deleteProductAction(id: string) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "DELETE_PRODUCT",
      feature: "PRODUCTS",
      entityType: "products",
      entityId: id,
      route: PRODUCTS_ROUTE,
    },
    () => deleteProduct(id),
  );
}

export async function updateInventoryAction(input: unknown) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "UPDATE_INVENTORY",
      feature: "PRODUCTS",
      route: PRODUCTS_ROUTE,
    },
    () => updateInventory(input),
  );
}
