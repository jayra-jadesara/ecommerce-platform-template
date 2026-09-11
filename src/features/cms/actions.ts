"use server";

import { requirePermission } from "@/features/auth/session";
import {
  createAdminBanner,
  deleteAdminBanner,
  updateAdminBanner,
} from "@/features/cms/banners-service";
import {
  createAdminPage,
  setPageStatus,
  updateAdminPage,
} from "@/features/cms/pages-service";
import {
  createPageSection,
  deletePageSection,
  duplicatePageSection,
  moveSection,
  reorderPageSections,
  updatePageSection,
} from "@/features/cms/sections-service";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function createPageAction(raw: unknown) {
  await requirePermission("content.create");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "CREATE_PAGE",
      feature: "CMS",
      entityType: "page",
      route: "/content/pages",
    },
    () => createAdminPage(raw),
  );
}

export async function updatePageAction(id: string, raw: unknown) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_PAGE",
      feature: "CMS",
      entityType: "page",
      entityId: id,
      route: "/content/pages",
    },
    () => updateAdminPage(id, raw),
  );
}

export async function publishPageAction(id: string) {
  await requirePermission("content.publish");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "PUBLISH_PAGE",
      feature: "CMS",
      entityType: "page",
      entityId: id,
      route: "/content/pages",
    },
    () => setPageStatus(id, "published"),
  );
}

export async function unpublishPageAction(id: string) {
  await requirePermission("content.publish");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_PAGE",
      feature: "CMS",
      entityType: "page",
      entityId: id,
      route: "/content/pages",
    },
    () => setPageStatus(id, "draft"),
  );
}

export async function archivePageAction(id: string) {
  await requirePermission("content.delete");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "DELETE_PAGE",
      feature: "CMS",
      entityType: "page",
      entityId: id,
      route: "/content/pages",
    },
    () => setPageStatus(id, "archived"),
  );
}

export async function createSectionAction(raw: unknown) {
  await requirePermission("content.create");
  const parsed = z
    .object({
      pageId: z.string().uuid(),
      sectionType: z.string(),
      title: z.string().max(200).optional().nullable(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid section." };
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "CREATE_SECTION",
      feature: "CMS",
      entityType: "page_section",
      entityId: parsed.data.pageId,
      route: "/content/pages",
    },
    () => createPageSection(parsed.data),
  );
}

export async function updateSectionAction(raw: unknown) {
  await requirePermission("content.update");
  const parsed = z
    .object({
      sectionId: z.string().uuid(),
      title: z.string().max(200).optional().nullable(),
      isActive: z.boolean().optional(),
      config: z.unknown().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid section." };
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_SECTION",
      feature: "CMS",
      entityType: "page_section",
      entityId: parsed.data.sectionId,
      route: "/content/pages",
    },
    () => updatePageSection(parsed.data),
  );
}

export async function duplicateSectionAction(sectionId: string) {
  await requirePermission("content.create");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "CREATE_SECTION",
      feature: "CMS",
      entityType: "page_section",
      entityId: sectionId,
      route: "/content/pages",
    },
    () => duplicatePageSection(sectionId),
  );
}

export async function deleteSectionAction(sectionId: string) {
  await requirePermission("content.delete");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "DELETE_SECTION",
      feature: "CMS",
      entityType: "page_section",
      entityId: sectionId,
      route: "/content/pages",
    },
    () => deletePageSection(sectionId),
  );
}

export async function reorderSectionsAction(raw: unknown) {
  await requirePermission("content.update");
  const parsed = z
    .object({
      pageId: z.string().uuid(),
      orderedIds: z.array(z.string().uuid()).min(1),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid order." };
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "REORDER_SECTION",
      feature: "CMS",
      entityType: "page",
      entityId: parsed.data.pageId,
      route: "/content/pages",
    },
    () => reorderPageSections(parsed.data),
  );
}

export async function moveSectionAction(raw: unknown) {
  await requirePermission("content.update");
  const parsed = z
    .object({
      sectionId: z.string().uuid(),
      direction: z.enum(["up", "down"]),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid move." };
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "REORDER_SECTION",
      feature: "CMS",
      entityType: "page_section",
      entityId: parsed.data.sectionId,
      route: "/content/pages",
    },
    () => moveSection(parsed.data),
  );
}

export async function createBannerAction(raw: unknown) {
  await requirePermission("content.create");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "CREATE_BANNER",
      feature: "CMS",
      entityType: "banner",
      route: "/content/banners",
    },
    () => createAdminBanner(raw),
  );
}

export async function updateBannerAction(id: string, raw: unknown) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_BANNER",
      feature: "CMS",
      entityType: "banner",
      entityId: id,
      route: "/content/banners",
    },
    () => updateAdminBanner(id, raw),
  );
}

export async function deleteBannerAction(id: string) {
  await requirePermission("content.delete");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "DELETE_BANNER",
      feature: "CMS",
      entityType: "banner",
      entityId: id,
      route: "/content/banners",
    },
    () => deleteAdminBanner(id),
  );
}

/** Newsletter signup — stores email only; no outbound email. */
export async function subscribeNewsletterAction(raw: unknown) {
  const { enforceRateLimit, rateLimitErrorMessage } = await import(
    "@/lib/security/server-rate-limit"
  );
  const limited = await enforceRateLimit("newsletter");
  if (!limited.allowed) {
    return {
      ok: false as const,
      error: rateLimitErrorMessage(limited.retryAfterMs),
    };
  }

  const parsed = z
    .object({
      email: z.string().email("Enter a valid email."),
    })
    .safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid email.",
    };
  }

  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false as const, error: "Store unavailable." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("newsletter_subscribers").insert({
    store_id: storeId,
    email: parsed.data.email.trim().toLowerCase(),
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true as const, message: "You're already subscribed." };
    }
    return { ok: false as const, error: "Unable to subscribe right now." };
  }

  return { ok: true as const, message: "Thanks — you're on the list." };
}
