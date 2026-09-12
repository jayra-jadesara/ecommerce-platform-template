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
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";
import type { FieldErrors } from "@/lib/validation";

function failureWithFieldErrors(result: {
  error: string;
  fieldErrors?: FieldErrors;
}) {
  return {
    ok: false as const,
    error: result.error,
    ...(result.fieldErrors ? { fieldErrors: result.fieldErrors } : {}),
  };
}

export async function createBlogPostAction(raw: unknown) {
  await requirePermission("blog.create");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "CREATE_BLOG_POST",
      feature: "BLOG",
      entityType: "blog_post",
      route: "/blog/posts",
    },
    async () => {
      const result = await createAdminBlogPost(raw);
      if (!result.ok) return failureWithFieldErrors(result);
      return {
        ok: true as const,
        message: result.message,
        id: result.id ?? result.post.id,
      };
    },
  );
}

export async function updateBlogPostAction(id: string, raw: unknown) {
  await requirePermission("blog.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_BLOG_POST",
      feature: "BLOG",
      entityType: "blog_post",
      entityId: id,
      route: "/blog/posts",
    },
    async () => {
      const result = await updateAdminBlogPost(id, raw);
      if (!result.ok) return failureWithFieldErrors(result);
      return {
        ok: true as const,
        message: result.message,
        id: result.id ?? result.post.id,
      };
    },
  );
}

export async function deleteBlogPostAction(id: string) {
  await requirePermission("blog.delete");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "DELETE_BLOG_POST",
      feature: "BLOG",
      entityType: "blog_post",
      entityId: id,
      route: "/blog/posts",
    },
    async () => {
      const result = await deleteAdminBlogPost(id);
      if (!result.ok) return { ok: false as const, error: result.error };
      return {
        ok: true as const,
        message: result.message,
        id: result.id ?? id,
      };
    },
  );
}

export async function publishBlogPostAction(id: string) {
  await requirePermission("blog.publish");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "PUBLISH_BLOG_POST",
      feature: "BLOG",
      entityType: "blog_post",
      entityId: id,
      route: "/blog/posts",
    },
    async () => {
      const result = await setBlogPostStatus(id, "published");
      if (!result.ok) return { ok: false as const, error: result.error };
      return {
        ok: true as const,
        message: result.message ?? "Post published.",
        id: result.id ?? id,
      };
    },
  );
}

export async function unpublishBlogPostAction(id: string) {
  await requirePermission("blog.publish");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UNPUBLISH_BLOG_POST",
      feature: "BLOG",
      entityType: "blog_post",
      entityId: id,
      route: "/blog/posts",
    },
    async () => {
      const result = await setBlogPostStatus(id, "draft");
      if (!result.ok) return { ok: false as const, error: result.error };
      return {
        ok: true as const,
        message: result.message ?? "Post unpublished.",
        id: result.id ?? id,
      };
    },
  );
}

export async function archiveBlogPostAction(id: string) {
  await requirePermission("blog.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "ARCHIVE_BLOG_POST",
      feature: "BLOG",
      entityType: "blog_post",
      entityId: id,
      route: "/blog/posts",
    },
    async () => {
      const result = await setBlogPostStatus(id, "archived");
      if (!result.ok) return { ok: false as const, error: result.error };
      return {
        ok: true as const,
        message: result.message ?? "Post archived.",
        id: result.id ?? id,
      };
    },
  );
}

export async function createBlogCategoryAction(raw: unknown) {
  await requirePermission("blog.create");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_BLOG_CATEGORY",
      feature: "BLOG",
      entityType: "blog_category",
      route: "/blog/categories",
    },
    async () => {
      const result = await createAdminBlogCategory(raw);
      if (!result.ok) return failureWithFieldErrors(result);
      return {
        ok: true as const,
        message: result.message,
        id: result.id ?? result.category.id,
      };
    },
  );
}

export async function updateBlogCategoryAction(id: string, raw: unknown) {
  await requirePermission("blog.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_BLOG_CATEGORY",
      feature: "BLOG",
      entityType: "blog_category",
      entityId: id,
      route: "/blog/categories",
    },
    async () => {
      const result = await updateAdminBlogCategory(id, raw);
      if (!result.ok) return failureWithFieldErrors(result);
      return {
        ok: true as const,
        message: result.message,
        id: result.id ?? result.category.id,
      };
    },
  );
}

export async function deleteBlogCategoryAction(id: string) {
  await requirePermission("blog.delete");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_BLOG_CATEGORY",
      feature: "BLOG",
      entityType: "blog_category",
      entityId: id,
      route: "/blog/categories",
    },
    async () => {
      const result = await deleteAdminBlogCategory(id);
      if (!result.ok) return { ok: false as const, error: result.error };
      return {
        ok: true as const,
        message: result.message,
        id: result.id ?? id,
      };
    },
  );
}

export async function moveBlogCategoryAction(
  id: string,
  direction: "up" | "down",
) {
  await requirePermission("blog.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_BLOG_CATEGORY",
      feature: "BLOG",
      entityType: "blog_category",
      entityId: id,
      route: "/blog/categories",
    },
    async () => {
      const result = await moveAdminBlogCategory(id, direction);
      if (!result.ok) return { ok: false as const, error: result.error };
      return {
        ok: true as const,
        message: result.message,
        id: result.id ?? id,
      };
    },
  );
}

export async function saveBlogSettingsAction(raw: unknown) {
  await requirePermission("blog.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_BLOG_SETTINGS",
      feature: "BLOG",
      entityType: "blog_settings",
      route: "/blog/settings",
    },
    async () => {
      const result = await upsertAdminBlogSettings(raw);
      if (!result.ok) return failureWithFieldErrors(result);
      return {
        ok: true as const,
        message: result.message,
      };
    },
  );
}
