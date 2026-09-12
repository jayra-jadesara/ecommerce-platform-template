import "server-only";

import { revalidateTag } from "next/cache";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import { writeContentAudit } from "@/features/cms/audit";
import {
  pageCacheTag,
  STOREFRONT_HOMEPAGE_CACHE_TAG,
  STOREFRONT_PAGES_CACHE_TAG,
} from "@/features/cms/cache";
import {
  ABOUT_PAGE_SLUG,
  HOMEPAGE_SLUG,
  pageFormSchema,
  type PageFormValues,
} from "@/features/cms/schemas";
import type { ContentPage } from "@/features/cms/types";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodValidationFailure, type FieldErrors } from "@/lib/validation";
import type { Tables } from "@/types/database";

function mapPage(row: Tables<"pages">): ContentPage {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    status: row.status,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    featuredImagePath: row.featured_image_path ?? null,
    ogImagePath: row.og_image_path ?? null,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function revalidatePages(slug?: string) {
  revalidateTag(STOREFRONT_PAGES_CACHE_TAG, "max");
  if (slug === HOMEPAGE_SLUG) {
    revalidateTag(STOREFRONT_HOMEPAGE_CACHE_TAG, "max");
  }
  if (slug) revalidateTag(pageCacheTag(slug), "max");
}

export async function listAdminPages(): Promise<ContentPage[]> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("store_id", storeId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map(mapPage);
}

export async function getAdminPage(id: string): Promise<ContentPage | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();
  return data ? mapPage(data) : null;
}

export async function getOrCreateHomepagePage(): Promise<ContentPage | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("pages")
    .select("*")
    .eq("store_id", storeId)
    .eq("slug", HOMEPAGE_SLUG)
    .maybeSingle();
  if (existing) return mapPage(existing);

  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("pages")
    .insert({
      store_id: storeId,
      title: "Homepage",
      slug: HOMEPAGE_SLUG,
      status: "draft",
      content: null,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "PAGE_CREATED",
    entityType: "page",
    entityId: data.id,
    metadata: { slug: HOMEPAGE_SLUG, title: "Homepage" },
  });

  return mapPage(data);
}

export async function getOrCreateAboutPage(): Promise<ContentPage | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("pages")
    .select("*")
    .eq("store_id", storeId)
    .eq("slug", ABOUT_PAGE_SLUG)
    .maybeSingle();
  if (existing) return mapPage(existing);

  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("pages")
    .insert({
      store_id: storeId,
      title: "About",
      slug: ABOUT_PAGE_SLUG,
      status: "draft",
      content: null,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "PAGE_CREATED",
    entityType: "page",
    entityId: data.id,
    metadata: { slug: ABOUT_PAGE_SLUG, title: "About" },
  });

  return mapPage(data);
}

export type PageMutationResult =
  | { ok: true; page: ContentPage; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export async function createAdminPage(raw: unknown): Promise<PageMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = pageFormSchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid page.");
  }
  if (parsed.data.slug === HOMEPAGE_SLUG) {
    return {
      ok: false,
      error: "The homepage is managed under Content → Homepage.",
      fieldErrors: {
        slug: "The homepage is managed under Content → Homepage.",
      },
    };
  }
  if (parsed.data.slug === ABOUT_PAGE_SLUG) {
    return {
      ok: false,
      error: "The about page is managed under Content → About.",
      fieldErrors: {
        slug: "The about page is managed under Content → About.",
      },
    };
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("pages")
    .insert({
      store_id: storeId,
      title: values.title,
      slug: values.slug,
      content: values.content,
      status: values.status,
      seo_title: values.seoTitle,
      seo_description: values.seoDescription,
      featured_image_path: values.featuredImagePath,
      og_image_path: values.ogImagePath,
      published_at:
        values.status === "published" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "A page with this URL already exists.",
        fieldErrors: { slug: "A page with this URL already exists." },
      };
    }
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "CREATE_PAGE",
      feature: "CMS",
      message: error?.message || "Unable to create page",
      error,
      storeId,
      entityType: "page",
      route: "/content/pages",
    });
  }

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "PAGE_CREATED",
    entityType: "page",
    entityId: data.id,
    metadata: { slug: values.slug },
  });
  if (values.status === "published") {
    await writeContentAudit({
      storeId,
      userId: user?.id ?? null,
      action: "PAGE_PUBLISHED",
      entityType: "page",
      entityId: data.id,
    });
  }

  revalidatePages(values.slug);
  return { ok: true, page: mapPage(data), message: "Page created." };
}

export async function updateAdminPage(
  id: string,
  raw: unknown,
): Promise<PageMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = pageFormSchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid page.");
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data: current } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Page not found." };

  if (current.slug === HOMEPAGE_SLUG && values.slug !== HOMEPAGE_SLUG) {
    return {
      ok: false,
      error: "The homepage URL cannot be changed.",
      fieldErrors: { slug: "The homepage URL cannot be changed." },
    };
  }
  if (current.slug === ABOUT_PAGE_SLUG && values.slug !== ABOUT_PAGE_SLUG) {
    return {
      ok: false,
      error: "The about page URL cannot be changed.",
      fieldErrors: { slug: "The about page URL cannot be changed." },
    };
  }

  const wasPublished = current.status === "published";
  const willPublish = values.status === "published";
  const willArchive = values.status === "archived";

  const { data, error } = await supabase
    .from("pages")
    .update({
      title: values.title,
      slug: values.slug,
      content: values.content,
      status: values.status,
      seo_title: values.seoTitle,
      seo_description: values.seoDescription,
      featured_image_path: values.featuredImagePath,
      og_image_path: values.ogImagePath,
      published_at: willPublish
        ? current.published_at ?? new Date().toISOString()
        : current.published_at,
    })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "A page with this URL already exists.",
        fieldErrors: { slug: "A page with this URL already exists." },
      };
    }
    const operation =
      !wasPublished && willPublish
        ? "PUBLISH_PAGE"
        : willArchive && current.status !== "archived"
          ? "DELETE_PAGE"
          : "UPDATE_PAGE";
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation,
      feature: "CMS",
      message: error?.message || "Unable to update page",
      error,
      storeId,
      entityType: "page",
      entityId: id,
      route: "/content/pages",
    });
  }

  const isHomepage = data.slug === HOMEPAGE_SLUG;
  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: isHomepage ? "HOMEPAGE_UPDATED" : "PAGE_UPDATED",
    entityType: isHomepage ? "homepage" : "page",
    entityId: data.id,
    metadata: { slug: data.slug, status: data.status },
  });

  const seoChanged =
    (current.seo_title ?? null) !== (values.seoTitle ?? null) ||
    (current.seo_description ?? null) !== (values.seoDescription ?? null) ||
    (current.og_image_path ?? null) !== (values.ogImagePath ?? null);
  if (seoChanged) {
    await writeContentAudit({
      storeId,
      userId: user?.id ?? null,
      action: "PAGE_SEO_UPDATED",
      entityType: isHomepage ? "homepage" : "page",
      entityId: data.id,
      metadata: {
        seo_title: values.seoTitle,
        seo_description: values.seoDescription,
      },
    });
  }

  if (!wasPublished && willPublish) {
    await writeContentAudit({
      storeId,
      userId: user?.id ?? null,
      action: isHomepage ? "HOMEPAGE_PUBLISHED" : "PAGE_PUBLISHED",
      entityType: isHomepage ? "homepage" : "page",
      entityId: data.id,
    });
  } else if (wasPublished && !willPublish && values.status === "draft") {
    await writeContentAudit({
      storeId,
      userId: user?.id ?? null,
      action: "PAGE_UNPUBLISHED",
      entityType: "page",
      entityId: data.id,
    });
  } else if (willArchive) {
    await writeContentAudit({
      storeId,
      userId: user?.id ?? null,
      action: "PAGE_ARCHIVED",
      entityType: "page",
      entityId: data.id,
    });
  }

  revalidatePages(current.slug);
  if (data.slug !== current.slug) revalidatePages(data.slug);

  return { ok: true, page: mapPage(data), message: "Page saved." };
}

export async function setPageStatus(
  id: string,
  status: PageFormValues["status"],
): Promise<PageMutationResult> {
  const page = await getAdminPage(id);
  if (!page) return { ok: false, error: "Page not found." };
  return updateAdminPage(id, {
    title: page.title,
    slug: page.slug,
    content: page.content,
    featuredImagePath: page.featuredImagePath,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    ogImagePath: page.ogImagePath,
    status,
  });
}

export function toPageFormValues(page: ContentPage): PageFormValues {
  return {
    title: page.title,
    slug: page.slug,
    content: page.content,
    featuredImagePath: page.featuredImagePath,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    ogImagePath: page.ogImagePath,
    status: page.status,
  };
}
