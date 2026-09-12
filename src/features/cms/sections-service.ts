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
  defaultConfigForType,
  HOMEPAGE_SLUG,
  isSupportedSectionType,
  parseSectionConfig,
  type SupportedSectionType,
} from "@/features/cms/schemas";
import type { ContentSection } from "@/features/cms/types";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FieldErrors } from "@/lib/validation";
import type { Json, Tables, TablesUpdate } from "@/types/database";

function mapSection(row: Tables<"page_sections">): ContentSection {
  return {
    id: row.id,
    pageId: row.page_id,
    sectionType: row.section_type,
    title: row.title,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    config: (row.config as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function revalidateForPageId(pageId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pages")
    .select("slug")
    .eq("id", pageId)
    .maybeSingle();
  if (!data) return;
  revalidateTag(STOREFRONT_PAGES_CACHE_TAG, "max");
  revalidateTag(pageCacheTag(data.slug), "max");
  if (data.slug === HOMEPAGE_SLUG) {
    revalidateTag(STOREFRONT_HOMEPAGE_CACHE_TAG, "max");
  }
}

async function assertPageInStore(pageId: string): Promise<{
  storeId: string;
  slug: string;
} | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pages")
    .select("id, store_id, slug")
    .eq("id", pageId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data) return null;
  return { storeId: data.store_id, slug: data.slug };
}

export async function listPageSections(
  pageId: string,
): Promise<ContentSection[]> {
  const scope = await assertPageInStore(pageId);
  if (!scope) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page_id", pageId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []).map(mapSection);
}

export type SectionMutationResult =
  | { ok: true; section?: ContentSection; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export async function createPageSection(input: {
  pageId: string;
  sectionType: string;
  title?: string | null;
}): Promise<SectionMutationResult> {
  const scope = await assertPageInStore(input.pageId);
  if (!scope) return { ok: false, error: "Page not found." };
  if (!isSupportedSectionType(input.sectionType)) {
    return { ok: false, error: "Unsupported section type." };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  const { data: maxRow } = await supabase
    .from("page_sections")
    .select("sort_order")
    .eq("page_id", input.pageId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? -1) + 1;
  const config = defaultConfigForType(input.sectionType);

  const { data, error } = await supabase
    .from("page_sections")
    .insert({
      page_id: input.pageId,
      section_type: input.sectionType,
      title: input.title ?? null,
      sort_order: sortOrder,
      is_active: true,
      config: config as unknown as Json,
    })
    .select("*")
    .single();

  if (error || !data) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "CREATE_SECTION",
      feature: "CMS",
      message: error?.message || "Unable to add section",
      error,
      storeId: scope.storeId,
      entityType: "page_section",
      entityId: input.pageId,
      route: "/content/pages",
    });
  }

  await writeContentAudit({
    storeId: scope.storeId,
    userId: user?.id ?? null,
    action: "SECTION_CREATED",
    entityType: "page_section",
    entityId: data.id,
    metadata: { pageId: input.pageId, sectionType: input.sectionType },
  });
  await revalidateForPageId(input.pageId);

  return { ok: true, section: mapSection(data), message: "Section added." };
}

export async function updatePageSection(input: {
  sectionId: string;
  title?: string | null;
  isActive?: boolean;
  config?: unknown;
}): Promise<SectionMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data: current } = await supabase
    .from("page_sections")
    .select("*, pages!inner(store_id, slug)")
    .eq("id", input.sectionId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Section not found." };
  const pageMeta = current.pages as unknown as { store_id: string; slug: string };
  if (pageMeta.store_id !== storeId) {
    return { ok: false, error: "Section not found." };
  }

  const patch: TablesUpdate<"page_sections"> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  if (input.config !== undefined) {
    const parsed = parseSectionConfig(current.section_type, input.config);
    if (!parsed.ok) {
      return {
        ok: false,
        error: parsed.error,
        ...(parsed.fieldErrors ? { fieldErrors: parsed.fieldErrors } : {}),
      };
    }
    patch.config = parsed.config as unknown as Json;
  }

  const { data, error } = await supabase
    .from("page_sections")
    .update(patch)
    .eq("id", input.sectionId)
    .select("*")
    .single();

  if (error || !data) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "UPDATE_SECTION",
      feature: "CMS",
      message: error?.message || "Unable to update section",
      error,
      storeId,
      entityType: "page_section",
      entityId: input.sectionId,
      route: "/content/pages",
    });
  }

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "SECTION_UPDATED",
    entityType: "page_section",
    entityId: data.id,
    metadata: { pageId: data.page_id },
  });
  await revalidateForPageId(data.page_id);

  return { ok: true, section: mapSection(data), message: "Section saved." };
}

export async function duplicatePageSection(
  sectionId: string,
): Promise<SectionMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data: current } = await supabase
    .from("page_sections")
    .select("*, pages!inner(store_id)")
    .eq("id", sectionId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Section not found." };
  const pageMeta = current.pages as unknown as { store_id: string };
  if (pageMeta.store_id !== storeId) {
    return { ok: false, error: "Section not found." };
  }
  if (!isSupportedSectionType(current.section_type)) {
    return { ok: false, error: "This section type cannot be duplicated." };
  }

  const { data: maxRow } = await supabase
    .from("page_sections")
    .select("sort_order")
    .eq("page_id", current.page_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("page_sections")
    .insert({
      page_id: current.page_id,
      section_type: current.section_type as SupportedSectionType,
      title: current.title ? `${current.title} (copy)` : null,
      sort_order: (maxRow?.sort_order ?? 0) + 1,
      is_active: false,
      config: current.config,
    })
    .select("*")
    .single();

  if (error || !data) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "CREATE_SECTION",
      feature: "CMS",
      message: error?.message || "Unable to duplicate section",
      error,
      storeId,
      entityType: "page_section",
      entityId: sectionId,
      route: "/content/pages",
    });
  }

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "SECTION_CREATED",
    entityType: "page_section",
    entityId: data.id,
    metadata: { duplicatedFrom: sectionId },
  });
  await revalidateForPageId(current.page_id);

  return { ok: true, section: mapSection(data), message: "Section duplicated." };
}

export async function deletePageSection(
  sectionId: string,
): Promise<SectionMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data: current } = await supabase
    .from("page_sections")
    .select("id, page_id, pages!inner(store_id)")
    .eq("id", sectionId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Section not found." };
  const pageMeta = current.pages as unknown as { store_id: string };
  if (pageMeta.store_id !== storeId) {
    return { ok: false, error: "Section not found." };
  }

  const { error } = await supabase
    .from("page_sections")
    .delete()
    .eq("id", sectionId);

  if (error) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "DELETE_SECTION",
      feature: "CMS",
      message: error.message || "Unable to delete section",
      error,
      storeId,
      entityType: "page_section",
      entityId: sectionId,
      route: "/content/pages",
    });
  }

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "SECTION_DELETED",
    entityType: "page_section",
    entityId: sectionId,
    metadata: { pageId: current.page_id },
  });
  await revalidateForPageId(current.page_id);

  return { ok: true, message: "Section deleted." };
}

export async function reorderPageSections(input: {
  pageId: string;
  orderedIds: string[];
}): Promise<SectionMutationResult> {
  const scope = await assertPageInStore(input.pageId);
  if (!scope) return { ok: false, error: "Page not found." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  const existing = await listPageSections(input.pageId);
  const existingIds = new Set(existing.map((s) => s.id));

  if (
    input.orderedIds.length !== existing.length ||
    input.orderedIds.some((id) => !existingIds.has(id))
  ) {
    return { ok: false, error: "Invalid section order." };
  }

  for (let i = 0; i < input.orderedIds.length; i++) {
    const { error } = await supabase
      .from("page_sections")
      .update({ sort_order: i })
      .eq("id", input.orderedIds[i]!)
      .eq("page_id", input.pageId);
    if (error) {
      return unexpectedFailure({
        type: "CMS",
        source: "DATABASE",
        operation: "REORDER_SECTION",
        feature: "CMS",
        message: error.message || "Unable to reorder sections",
        error,
        storeId: scope.storeId,
        entityType: "page",
        entityId: input.pageId,
        route: "/content/pages",
      });
    }
  }

  await writeContentAudit({
    storeId: scope.storeId,
    userId: user?.id ?? null,
    action: "SECTION_REORDERED",
    entityType: "page",
    entityId: input.pageId,
    metadata: { orderedIds: input.orderedIds },
  });
  await revalidateForPageId(input.pageId);

  return { ok: true, message: "Order updated." };
}

export async function moveSection(input: {
  sectionId: string;
  direction: "up" | "down";
}): Promise<SectionMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };
  const supabase = await createSupabaseServerClient();

  const { data: current } = await supabase
    .from("page_sections")
    .select("id, page_id, pages!inner(store_id)")
    .eq("id", input.sectionId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Section not found." };
  const pageMeta = current.pages as unknown as { store_id: string };
  if (pageMeta.store_id !== storeId) {
    return { ok: false, error: "Section not found." };
  }

  const sections = await listPageSections(current.page_id);
  const index = sections.findIndex((s) => s.id === input.sectionId);
  if (index < 0) return { ok: false, error: "Section not found." };

  const swapWith =
    input.direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= sections.length) {
    return { ok: true, message: "Already at the edge." };
  }

  const ordered = sections.map((s) => s.id);
  const tmp = ordered[index]!;
  ordered[index] = ordered[swapWith]!;
  ordered[swapWith] = tmp;

  return reorderPageSections({ pageId: current.page_id, orderedIds: ordered });
}
