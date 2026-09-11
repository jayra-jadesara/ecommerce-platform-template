import "server-only";

import { revalidateTag } from "next/cache";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import { writeBlogAudit } from "@/features/blog/audit";
import {
  blogCategoryCacheTag,
  STOREFRONT_BLOG_CACHE_TAG,
} from "@/features/blog/cache";
import {
  blogCategoryFormSchema,
  DEFAULT_BLOG_CATEGORY_FORM,
  type BlogCategoryFormValues,
} from "@/features/blog/schemas";
import type { BlogCategory } from "@/features/blog/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

function mapCategory(row: Tables<"blog_categories">): BlogCategory {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imagePath: row.image_path,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function revalidateBlogCategories(slug?: string) {
  revalidateTag(STOREFRONT_BLOG_CACHE_TAG, "max");
  if (slug) revalidateTag(blogCategoryCacheTag(slug), "max");
}

export function toBlogCategoryFormValues(
  category: BlogCategory,
): BlogCategoryFormValues {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    imagePath: category.imagePath,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
  };
}

export type BlogCategoryMutationResult =
  | { ok: true; category: BlogCategory; message?: string; id?: string }
  | { ok: false; error: string };

export async function listAdminBlogCategories(): Promise<BlogCategory[]> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("blog_categories")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []).map(mapCategory);
}

export type AdminBlogCategoryRow = BlogCategory & { postCount: number };

export async function listAdminBlogCategoriesWithCounts(): Promise<
  AdminBlogCategoryRow[]
> {
  const categories = await listAdminBlogCategories();
  if (!categories.length) return [];

  const storeId = await resolveActiveStoreId();
  if (!storeId) return categories.map((c) => ({ ...c, postCount: 0 }));

  const supabase = await createSupabaseServerClient();
  const { data: links } = await supabase
    .from("blog_post_categories")
    .select("category_id")
    .eq("store_id", storeId);

  const counts = new Map<string, number>();
  for (const link of links ?? []) {
    counts.set(link.category_id, (counts.get(link.category_id) ?? 0) + 1);
  }

  return categories.map((c) => ({
    ...c,
    postCount: counts.get(c.id) ?? 0,
  }));
}

export async function getAdminBlogCategory(
  id: string,
): Promise<BlogCategory | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("blog_categories")
    .select("*")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();
  return data ? mapCategory(data) : null;
}

export async function createAdminBlogCategory(
  raw: unknown,
): Promise<BlogCategoryMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = blogCategoryFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid category.",
    };
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("blog_categories")
    .insert({
      store_id: storeId,
      name: values.name,
      slug: values.slug,
      description: values.description,
      image_path: values.imagePath,
      is_active: values.isActive,
      sort_order: values.sortOrder,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, error: "A category with this URL already exists." };
    }
    return { ok: false, error: "Unable to create category." };
  }

  await writeBlogAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BLOG_CATEGORY_CREATED",
    entityType: "blog_category",
    entityId: data.id,
    metadata: { slug: values.slug, name: values.name },
  });

  revalidateBlogCategories(values.slug);
  return {
    ok: true,
    category: mapCategory(data),
    message: "Category created.",
    id: data.id,
  };
}

export async function updateAdminBlogCategory(
  id: string,
  raw: unknown,
): Promise<BlogCategoryMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = blogCategoryFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid category.",
    };
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data: current } = await supabase
    .from("blog_categories")
    .select("*")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Category not found." };

  const { data, error } = await supabase
    .from("blog_categories")
    .update({
      name: values.name,
      slug: values.slug,
      description: values.description,
      image_path: values.imagePath,
      is_active: values.isActive,
      sort_order: values.sortOrder,
    })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, error: "A category with this URL already exists." };
    }
    return { ok: false, error: "Unable to update category." };
  }

  await writeBlogAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BLOG_CATEGORY_UPDATED",
    entityType: "blog_category",
    entityId: data.id,
    metadata: { slug: values.slug, is_active: values.isActive },
  });

  revalidateBlogCategories(current.slug);
  if (data.slug !== current.slug) revalidateBlogCategories(data.slug);

  return {
    ok: true,
    category: mapCategory(data),
    message: "Category saved.",
    id: data.id,
  };
}

export async function deleteAdminBlogCategory(
  id: string,
): Promise<BlogCategoryMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const existing = await getAdminBlogCategory(id);
  if (!existing) return { ok: false, error: "Category not found." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  const { error } = await supabase
    .from("blog_categories")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) return { ok: false, error: "Unable to delete category." };

  await writeBlogAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BLOG_CATEGORY_DELETED",
    entityType: "blog_category",
    entityId: id,
    metadata: { slug: existing.slug, name: existing.name },
  });

  revalidateBlogCategories(existing.slug);
  return {
    ok: true,
    category: existing,
    message: "Category deleted.",
    id,
  };
}

export async function moveAdminBlogCategory(
  id: string,
  direction: "up" | "down",
): Promise<BlogCategoryMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const categories = await listAdminBlogCategories();
  const index = categories.findIndex((c) => c.id === id);
  if (index < 0) return { ok: false, error: "Category not found." };

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= categories.length) {
    return {
      ok: true,
      category: categories[index],
      message: "Already at the edge.",
      id,
    };
  }

  const a = categories[index];
  const b = categories[swapWith];
  const reordered = [...categories];
  reordered[index] = b;
  reordered[swapWith] = a;

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  for (let i = 0; i < reordered.length; i += 1) {
    const row = reordered[i];
    if (row.sortOrder === i) continue;
    const { error } = await supabase
      .from("blog_categories")
      .update({ sort_order: i })
      .eq("id", row.id)
      .eq("store_id", storeId);
    if (error) {
      return { ok: false, error: "Unable to reorder categories." };
    }
  }

  await writeBlogAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BLOG_CATEGORY_UPDATED",
    entityType: "blog_category",
    entityId: a.id,
    metadata: { reorder: direction, swapped_with: b.id },
  });

  revalidateBlogCategories();
  const updated = await getAdminBlogCategory(id);
  return {
    ok: true,
    category: updated ?? a,
    message: "Category order updated.",
    id,
  };
}

export { DEFAULT_BLOG_CATEGORY_FORM };
