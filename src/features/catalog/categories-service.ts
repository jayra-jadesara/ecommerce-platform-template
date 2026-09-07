import "server-only";

import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  CATALOG_CACHE_TAG,
  CATALOG_CATEGORIES_TAG,
  categoryCacheTag,
} from "@/features/catalog/cache";
import {
  categoryFormSchema,
  type CategoryFormValues,
} from "@/features/catalog/validation";
import { slugify } from "@/features/catalog/slug";

export type CatalogResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; error: string };

export type CategoryRow = {
  id: string;
  store_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
  created_at: string;
};

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function revalidateCatalogCategories(id?: string) {
  revalidateTag(CATALOG_CACHE_TAG, "max");
  revalidateTag(CATALOG_CATEGORIES_TAG, "max");
  if (id) revalidateTag(categoryCacheTag(id), "max");
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
  if (data?.[0]) return "A category with this slug already exists.";
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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid category." };
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

  const payload = {
    store_id: storeId,
    name: values.name.trim(),
    slug: values.slug,
    description: emptyToNull(values.description),
    parent_id: values.parentId,
    image_path: values.imagePath ?? null,
    sort_order: values.sortOrder,
    is_active: values.isActive,
  };

  const { data, error } = await supabase
    .from("categories")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Unable to create category. Check permissions and try again." };
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "CATEGORY_CREATED",
    entity_type: "categories",
    entity_id: data.id,
    metadata: { slug: values.slug, name: values.name },
  });

  revalidateCatalogCategories(data.id);
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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid category." };
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
    image_path: values.imagePath ?? null,
    sort_order: values.sortOrder,
    is_active: values.isActive,
  };

  const { error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    return { ok: false, error: "Unable to update category. Check permissions and try again." };
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "CATEGORY_UPDATED",
    entity_type: "categories",
    entity_id: id,
    metadata: { slug: values.slug, is_active: values.isActive },
  });

  revalidateCatalogCategories(id);
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

  if (error) return { ok: false, error: "Unable to archive category." };

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "CATEGORY_ARCHIVED",
    entity_type: "categories",
    entity_id: id,
    metadata: {},
  });

  revalidateCatalogCategories(id);
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

  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("category_id", id);

  if ((productCount ?? 0) > 0) {
    return {
      ok: false,
      error:
        "This category has products. Reassign or archive products first, or deactivate the category instead.",
    };
  }

  const { count: childCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("parent_id", id);

  if ((childCount ?? 0) > 0) {
    return {
      ok: false,
      error: "Remove or reassign child categories before deleting this category.",
    };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) return { ok: false, error: "Unable to delete category." };

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "CATEGORY_DELETED",
    entity_type: "categories",
    entity_id: id,
    metadata: {},
  });

  revalidateCatalogCategories(id);
  return { ok: true, message: "Category deleted." };
}

export function suggestCategorySlug(name: string): string {
  return slugify(name);
}
