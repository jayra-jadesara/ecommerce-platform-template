import "server-only";

import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import { writeContentAudit } from "@/features/cms/audit";
import { pageCacheTag } from "@/features/cms/cache";
import {
  ABOUT_PAGE_SLUG,
  CAREER_PAGE_SLUG,
  HOMEPAGE_SLUG,
  SECTION_TYPE_LABELS,
  defaultConfigForType,
  isLegalPageSlug,
  LEGAL_PAGE_META,
  type LegalPageSlug,
  pageFormSchema,
  type PageFormValues,
} from "@/features/cms/schemas";
import {
  DISCLAIMER_STARTER_MARKDOWN,
  PRIVACY_STARTER_MARKDOWN,
  TERMS_STARTER_MARKDOWN,
} from "@/features/cms/legal-templates";
import type { ContentPage } from "@/features/cms/types";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { publishStorefrontSync } from "@/features/sync/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodValidationFailure, type FieldErrors } from "@/lib/validation";
import type { Json, Tables } from "@/types/database";

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

async function revalidatePages(storeId: string, slug?: string) {
  const topics =
    slug === HOMEPAGE_SLUG
      ? (["cms.homepage"] as const)
      : (["cms.pages"] as const);
  await publishStorefrontSync({
    storeId,
    topics,
    extraTags: slug ? [pageCacheTag(slug)] : undefined,
  });
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

  if (existing) {
    const page = mapPage(existing);
    await ensureAboutSection(page.id);
    return page;
  }

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

  await ensureAboutSection(data.id);

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "PAGE_CREATED",
    entityType: "page",
    entityId: data.id,
    metadata: { slug: ABOUT_PAGE_SLUG, title: "About", seededSection: "about" },
  });

  return mapPage(data);
}

async function ensureAboutSection(pageId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: existingAbout } = await supabase
    .from("page_sections")
    .select("id")
    .eq("page_id", pageId)
    .eq("section_type", "about")
    .limit(1)
    .maybeSingle();

  if (existingAbout) return;

  const { data: maxRow } = await supabase
    .from("page_sections")
    .select("sort_order")
    .eq("page_id", pageId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const aboutConfig = defaultConfigForType("about");
  await supabase.from("page_sections").insert({
    page_id: pageId,
    section_type: "about",
    title: SECTION_TYPE_LABELS.about,
    sort_order: (maxRow?.sort_order ?? -1) + 1,
    is_active: true,
    config: aboutConfig as unknown as Json,
  });
}

export async function getOrCreateCareerPage(): Promise<ContentPage | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("pages")
    .select("*")
    .eq("store_id", storeId)
    .eq("slug", CAREER_PAGE_SLUG)
    .maybeSingle();

  if (existing) {
    const page = mapPage(existing);
    await ensureCareerSection(page.id);
    return page;
  }

  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("pages")
    .insert({
      store_id: storeId,
      title: "Career",
      slug: CAREER_PAGE_SLUG,
      status: "draft",
      content: null,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await ensureCareerSection(data.id);

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "PAGE_CREATED",
    entityType: "page",
    entityId: data.id,
    metadata: {
      slug: CAREER_PAGE_SLUG,
      title: "Career",
      seededSection: "career",
    },
  });

  return mapPage(data);
}

async function ensureCareerSection(pageId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: existingCareer } = await supabase
    .from("page_sections")
    .select("id")
    .eq("page_id", pageId)
    .eq("section_type", "career")
    .limit(1)
    .maybeSingle();

  if (existingCareer) return;

  const { data: maxRow } = await supabase
    .from("page_sections")
    .select("sort_order")
    .eq("page_id", pageId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const careerConfig = defaultConfigForType("career");
  await supabase.from("page_sections").insert({
    page_id: pageId,
    section_type: "career",
    title: SECTION_TYPE_LABELS.career,
    sort_order: (maxRow?.sort_order ?? -1) + 1,
    is_active: true,
    config: careerConfig as unknown as Json,
  });
}

function legalStarterContent(slug: LegalPageSlug): string {
  switch (slug) {
    case "privacy":
      return PRIVACY_STARTER_MARKDOWN;
    case "terms":
      return TERMS_STARTER_MARKDOWN;
    case "disclaimer":
      return DISCLAIMER_STARTER_MARKDOWN;
    default:
      return "";
  }
}

export async function getOrCreateLegalPage(
  slug: LegalPageSlug,
): Promise<ContentPage | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("pages")
    .select("*")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return mapPage(existing);

  const meta = LEGAL_PAGE_META[slug];
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("pages")
    .insert({
      store_id: storeId,
      title: meta.title,
      slug,
      status: "draft",
      content: legalStarterContent(slug),
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
    metadata: { slug, title: meta.title, legal: true },
  });

  return mapPage(data);
}

export async function listLegalPages(): Promise<ContentPage[]> {
  const pages = await Promise.all(
    (Object.keys(LEGAL_PAGE_META) as LegalPageSlug[]).map((slug) =>
      getOrCreateLegalPage(slug),
    ),
  );
  return pages.filter((p): p is ContentPage => Boolean(p));
}

export type PageMutationResult =
  | { ok: true; page: ContentPage; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

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

  const isSystemSlug =
    current.slug === HOMEPAGE_SLUG ||
    current.slug === ABOUT_PAGE_SLUG ||
    current.slug === CAREER_PAGE_SLUG ||
    isLegalPageSlug(current.slug);
  if (!isSystemSlug) {
    return {
      ok: false,
      error: "Custom pages are no longer supported. Use Content → About, Career, or Legal.",
    };
  }

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
  if (current.slug === CAREER_PAGE_SLUG && values.slug !== CAREER_PAGE_SLUG) {
    return {
      ok: false,
      error: "The career page URL cannot be changed.",
      fieldErrors: { slug: "The career page URL cannot be changed." },
    };
  }
  if (isLegalPageSlug(current.slug) && values.slug !== current.slug) {
    return {
      ok: false,
      error: "Legal page URLs cannot be changed.",
      fieldErrors: { slug: "Legal page URLs cannot be changed." },
    };
  }
  if (
    isLegalPageSlug(values.slug) &&
    !isLegalPageSlug(current.slug)
  ) {
    return {
      ok: false,
      error: "Legal pages are managed under Content → Legal pages.",
      fieldErrors: {
        slug: "Legal pages are managed under Content → Legal pages.",
      },
    };
  }
  if (
    values.slug === CAREER_PAGE_SLUG &&
    current.slug !== CAREER_PAGE_SLUG
  ) {
    return {
      ok: false,
      error: "The career page is managed under Content → Career.",
      fieldErrors: {
        slug: "The career page is managed under Content → Career.",
      },
    };
  }
  if (
    values.slug === ABOUT_PAGE_SLUG &&
    current.slug !== ABOUT_PAGE_SLUG
  ) {
    return {
      ok: false,
      error: "The about page is managed under Content → About.",
      fieldErrors: {
        slug: "The about page is managed under Content → About.",
      },
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
      route: "/content",
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

  await revalidatePages(storeId, current.slug);
  if (data.slug !== current.slug) {
    await revalidatePages(storeId, data.slug);
  }

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
