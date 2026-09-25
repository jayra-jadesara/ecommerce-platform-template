import "server-only";

import { getAdminPath } from "@/config/admin-route";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { categoryCacheTag } from "@/features/catalog/cache";
import { publishStorefrontSync } from "@/features/sync/server";
import {
  categoryFormSchema,
  type CategoryFormValues,
} from "@/features/catalog/validation";
import { slugify } from "@/features/catalog/slug";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import {
  checkCategoryDependencies,
} from "@/features/admin/validation/dependencies";
import { zodValidationFailure } from "@/lib/validation";
import { mapDatabaseConstraintError } from "@/lib/validation/db-errors";

export type CatalogResult =
  | { ok: true; message: string; id?: string }
  | {
      ok: false;
      error: string;
      referenceId?: string;
      kind?: "validation" | "dependency" | "error";
      fieldErrors?: Record<string, string>;
      suggestion?: "archive" | "deactivate" | "disable";
    };

const CATEGORIES_ROUTE = getAdminPath("/catalog/categories");

export type CategoryRow = {
  id: string;
  store_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
  created_at: string;
};

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function revalidateCatalogCategories(storeId: string, id?: string) {
  await publishStorefrontSync({
    storeId,
    topics: ["catalog.categories"],
    extraTags: id ? [categoryCacheTag(id)] : undefined,
  });
}

export async function listAdminCategories(): Promise<CategoryRow[]> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "categories.view")) return [];

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return [];

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data as CategoryRow[];
}

async function assertUniqueCategorySlug(
  storeId: string,
  slug: string,
  excludeId?: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("categories")
    .select("id")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  if (data?.[0]) return "This slug is already in use.";
  return null;
}

export async function createCategory(
  input: unknown,
): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "categories.create")) {
    return { ok: false, error: "You do not have permission to create categories." };
  }

  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    const failure = zodValidationFailure(parsed.error, "Invalid category.");
    return {
      ok: false,
      kind: "validation",
      error: failure.error,
      fieldErrors: failure.fieldErrors,
    };
  }

  const values: CategoryFormValues = parsed.data;
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  if (values.parentId) {
    const { data: parent } = await supabase
      .from("categories")
      .select("id")
      .eq("id", values.parentId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!parent) return { ok: false, error: "Parent category was not found." };
  }

  const slugConflict = await assertUniqueCategorySlug(storeId, values.slug);
  if (slugConflict) return { ok: false, error: slugConflict };

  const { data: maxRow } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder =
    typeof maxRow?.sort_order === "number" ? maxRow.sort_order + 1 : 0;

  const payload = {
    store_id: storeId,
    name: values.name.trim(),
    slug: values.slug,
    description: emptyToNull(values.description),
    parent_id: values.parentId,
    image_path: values.imagePath,
    sort_order: nextSortOrder,
    is_active: values.isActive,
    seo_title: emptyToNull(values.seoTitle),
    seo_description: emptyToNull(values.seoDescription),
  };

  const { data, error } = await supabase
    .from("categories")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "CREATE_CATEGORY",
      feature: "CATEGORIES",
      message: "Unable to create category",
      error: error ?? undefined,
      databaseCode: error?.code,
      storeId,
      entityType: "categories",
      route: CATEGORIES_ROUTE,
    });
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "CATEGORY_CREATED",
    entity_type: "categories",
    entity_id: data.id,
    metadata: { slug: values.slug, name: values.name },
  });

  await revalidateCatalogCategories(storeId, data.id);
  return { ok: true, message: "Category created.", id: data.id };
}

export async function updateCategory(
  id: string,
  input: unknown,
): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "categories.update")) {
    return { ok: false, error: "You do not have permission to update categories." };
  }

  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    const failure = zodValidationFailure(parsed.error, "Invalid category.");
    return {
      ok: false,
      kind: "validation",
      error: failure.error,
      fieldErrors: failure.fieldErrors,
    };
  }

  const values = parsed.data;
  if (values.parentId === id) {
    return { ok: false, error: "A category cannot be its own parent." };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const { data: existing } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Category not found." };

  if (values.parentId) {
    const { data: parent } = await supabase
      .from("categories")
      .select("id, parent_id")
      .eq("id", values.parentId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!parent) return { ok: false, error: "Parent category was not found." };
    if (parent.parent_id === id) {
      return { ok: false, error: "Cannot create a circular category hierarchy." };
    }
  }

  const slugConflict = await assertUniqueCategorySlug(storeId, values.slug, id);
  if (slugConflict) return { ok: false, error: slugConflict };

  const payload = {
    name: values.name.trim(),
    slug: values.slug,
    description: emptyToNull(values.description),
    parent_id: values.parentId,
    image_path: values.imagePath,
    sort_order: existing.sort_order,
    is_active: values.isActive,
    seo_title: emptyToNull(values.seoTitle),
    seo_description: emptyToNull(values.seoDescription),
  };

  const { error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "UPDATE_CATEGORY",
      feature: "CATEGORIES",
      message: "Unable to update category",
      error,
      databaseCode: error.code,
      storeId,
      entityType: "categories",
      entityId: id,
      route: CATEGORIES_ROUTE,
    });
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "CATEGORY_UPDATED",
    entity_type: "categories",
    entity_id: id,
    metadata: { slug: values.slug, is_active: values.isActive },
  });

  const seoChanged =
    (existing.seo_title ?? null) !== payload.seo_title ||
    (existing.seo_description ?? null) !== payload.seo_description;
  if (seoChanged) {
    await supabase.from("audit_logs").insert({
      store_id: storeId,
      user_id: admin.user.id,
      action: "CATEGORY_SEO_UPDATED",
      entity_type: "categories",
      entity_id: id,
      metadata: {
        seo_title: payload.seo_title,
        seo_description: payload.seo_description,
      },
    });
  }

  await revalidateCatalogCategories(storeId, id);
  return { ok: true, message: "Category updated.", id };
}

export async function archiveCategory(id: string): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "categories.update")) {
    return { ok: false, error: "You do not have permission to archive categories." };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const { error } = await supabase
    .from("categories")
    .update({ is_active: false })
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "DISABLE_CATEGORY",
      feature: "CATEGORIES",
      message: "Unable to archive category",
      error,
      databaseCode: error.code,
      storeId,
      entityType: "categories",
      entityId: id,
      route: CATEGORIES_ROUTE,
    });
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "CATEGORY_ARCHIVED",
    entity_type: "categories",
    entity_id: id,
    metadata: {},
  });

  await revalidateCatalogCategories(storeId, id);
  return { ok: true, message: "Category deactivated.", id };
}

export async function deleteCategory(id: string): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "categories.delete")) {
    return { ok: false, error: "You do not have permission to delete categories." };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const deps = await checkCategoryDependencies(id);
  if (deps && !deps.canDelete) {
    return {
      ok: false,
      kind: "dependency",
      error: deps.message,
      suggestion: "deactivate",
    };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    const mapped = mapDatabaseConstraintError(error, {
      entity: "category",
      dependencyHint:
        "Can't delete this category because it is currently being used. Deactivate it instead.",
    });
    if (mapped) {
      return {
        ok: false,
        kind: mapped.kind === "dependency" ? "dependency" : "validation",
        error: mapped.message,
        suggestion: mapped.suggestion,
      };
    }
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "DELETE_CATEGORY",
      feature: "CATEGORIES",
      message: "Unable to delete category",
      error,
      databaseCode: error.code,
      storeId,
      entityType: "categories",
      entityId: id,
      route: CATEGORIES_ROUTE,
    });
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "CATEGORY_DELETED",
    entity_type: "categories",
    entity_id: id,
    metadata: {},
  });

  await revalidateCatalogCategories(storeId, id);
  return { ok: true, message: "Category deleted." };
}

export async function moveCategory(
  id: string,
  direction: "up" | "down",
): Promise<CatalogResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "categories.update")) {
    return { ok: false, error: "You do not have permission to update categories." };
  }

  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "No active store found." };

  const categories = await listAdminCategories();
  const index = categories.findIndex((c) => c.id === id);
  if (index < 0) return { ok: false, error: "Category not found." };

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= categories.length) {
    return { ok: true, message: "Already at the edge.", id };
  }

  const a = categories[index];
  const b = categories[swapWith];
  const reordered = [...categories];
  reordered[index] = b;
  reordered[swapWith] = a;

  const supabase = await createSupabaseServerClient();

  for (let i = 0; i < reordered.length; i += 1) {
    const row = reordered[i];
    if (row.sort_order === i) continue;
    const { error } = await supabase
      .from("categories")
      .update({ sort_order: i })
      .eq("id", row.id)
      .eq("store_id", storeId);
    if (error) {
      return unexpectedFailure({
        type: "DATABASE",
        source: "DATABASE",
        operation: "REORDER_CATEGORY",
        feature: "CATEGORIES",
        message: "Unable to reorder category",
        error,
        databaseCode: error.code,
        storeId,
        entityType: "categories",
        entityId: id,
        route: CATEGORIES_ROUTE,
      });
    }
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "CATEGORY_UPDATED",
    entity_type: "categories",
    entity_id: a.id,
    metadata: { reorder: direction, swapped_with: b.id },
  });

  await revalidateCatalogCategories(storeId, id);
  return { ok: true, message: "Order updated.", id };
}

export function suggestCategorySlug(name: string): string {
  return slugify(name);
}
