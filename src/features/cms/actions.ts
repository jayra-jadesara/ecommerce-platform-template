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
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function createPageAction(raw: unknown) {
  await requirePermission("content.create");
  return createAdminPage(raw);
}

export async function updatePageAction(id: string, raw: unknown) {
  await requirePermission("content.update");
  return updateAdminPage(id, raw);
}

export async function publishPageAction(id: string) {
  await requirePermission("content.publish");
  return setPageStatus(id, "published");
}

export async function unpublishPageAction(id: string) {
  await requirePermission("content.publish");
  return setPageStatus(id, "draft");
}

export async function archivePageAction(id: string) {
  await requirePermission("content.delete");
  return setPageStatus(id, "archived");
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
  return createPageSection(parsed.data);
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
  return updatePageSection(parsed.data);
}

export async function duplicateSectionAction(sectionId: string) {
  await requirePermission("content.create");
  return duplicatePageSection(sectionId);
}

export async function deleteSectionAction(sectionId: string) {
  await requirePermission("content.delete");
  return deletePageSection(sectionId);
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
  return reorderPageSections(parsed.data);
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
  return moveSection(parsed.data);
}

export async function createBannerAction(raw: unknown) {
  await requirePermission("content.create");
  return createAdminBanner(raw);
}

export async function updateBannerAction(id: string, raw: unknown) {
  await requirePermission("content.update");
  return updateAdminBanner(id, raw);
}

export async function deleteBannerAction(id: string) {
  await requirePermission("content.delete");
  return deleteAdminBanner(id);
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
