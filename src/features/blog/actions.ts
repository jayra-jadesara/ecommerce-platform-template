"use server";

import { requirePermission } from "@/features/auth/session";
import {
  createAdminBlogCategory,
  deleteAdminBlogCategory,
  moveAdminBlogCategory,
  updateAdminBlogCategory,
} from "@/features/blog/categories-service";
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  setBlogPostStatus,
  updateAdminBlogPost,
} from "@/features/blog/posts-service";
import { upsertAdminBlogSettings } from "@/features/blog/settings-service";

export async function createBlogPostAction(raw: unknown) {
  await requirePermission("blog.create");
  const result = await createAdminBlogPost(raw);
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    message: result.message,
    id: result.id ?? result.post.id,
  };
}

export async function updateBlogPostAction(id: string, raw: unknown) {
  await requirePermission("blog.update");
  const result = await updateAdminBlogPost(id, raw);
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    message: result.message,
    id: result.id ?? result.post.id,
  };
}

export async function deleteBlogPostAction(id: string) {
  await requirePermission("blog.delete");
  const result = await deleteAdminBlogPost(id);
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    message: result.message,
    id: result.id ?? id,
  };
}

export async function publishBlogPostAction(id: string) {
  await requirePermission("blog.publish");
  const result = await setBlogPostStatus(id, "published");
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    message: result.message ?? "Post published.",
    id: result.id ?? id,
  };
}

export async function unpublishBlogPostAction(id: string) {
  await requirePermission("blog.publish");
  const result = await setBlogPostStatus(id, "draft");
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    message: result.message ?? "Post unpublished.",
    id: result.id ?? id,
  };
}

export async function archiveBlogPostAction(id: string) {
  await requirePermission("blog.update");
  const result = await setBlogPostStatus(id, "archived");
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    message: result.message ?? "Post archived.",
    id: result.id ?? id,
  };
}

export async function createBlogCategoryAction(raw: unknown) {
  await requirePermission("blog.create");
  const result = await createAdminBlogCategory(raw);
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    message: result.message,
    id: result.id ?? result.category.id,
  };
}

export async function updateBlogCategoryAction(id: string, raw: unknown) {
  await requirePermission("blog.update");
  const result = await updateAdminBlogCategory(id, raw);
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    message: result.message,
    id: result.id ?? result.category.id,
  };
}

export async function deleteBlogCategoryAction(id: string) {
  await requirePermission("blog.delete");
  const result = await deleteAdminBlogCategory(id);
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    message: result.message,
    id: result.id ?? id,
  };
}

export async function moveBlogCategoryAction(
  id: string,
  direction: "up" | "down",
) {
  await requirePermission("blog.update");
  const result = await moveAdminBlogCategory(id, direction);
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    message: result.message,
    id: result.id ?? id,
  };
}

export async function saveBlogSettingsAction(raw: unknown) {
  await requirePermission("blog.update");
  const result = await upsertAdminBlogSettings(raw);
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    message: result.message,
  };
}
