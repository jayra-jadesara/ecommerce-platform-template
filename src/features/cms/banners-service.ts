import "server-only";

import { revalidateTag } from "next/cache";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import { writeContentAudit } from "@/features/cms/audit";
import { STOREFRONT_BANNERS_CACHE_TAG } from "@/features/cms/cache";
import {
  bannerFormSchema,
  type BannerFormValues,
} from "@/features/cms/schemas";
import type { BannerRow } from "@/features/cms/types";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodValidationFailure, type FieldErrors } from "@/lib/validation";
import type { Tables } from "@/types/database";

function mapBanner(row: Tables<"banners">): BannerRow {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    description: row.description,
    imagePath: row.image_path,
    linkUrl: row.link_url,
    buttonText: row.button_text,
    isActive: row.is_active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function revalidateBanners() {
  revalidateTag(STOREFRONT_BANNERS_CACHE_TAG, "max");
}

export async function listAdminBanners(): Promise<BannerRow[]> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("banners")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapBanner);
}

export async function getAdminBanner(id: string): Promise<BannerRow | null> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("banners")
    .select("*")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();
  return data ? mapBanner(data) : null;
}

export type BannerMutationResult =
  | { ok: true; banner: BannerRow; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export async function createAdminBanner(
  raw: unknown,
): Promise<BannerMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = bannerFormSchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid banner.");
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("banners")
    .insert({
      store_id: storeId,
      title: values.title,
      description: values.description,
      image_path: values.imagePath,
      link_url: values.linkUrl,
      button_text: values.buttonText,
      is_active: values.isActive,
      starts_at: values.startsAt,
      ends_at: values.endsAt,
      sort_order: values.sortOrder,
    })
    .select("*")
    .single();

  if (error || !data) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "CREATE_BANNER",
      feature: "CMS",
      message: error?.message || "Unable to create banner",
      error,
      storeId,
      entityType: "banner",
      route: "/content/banners",
    });
  }

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BANNER_CREATED",
    entityType: "banner",
    entityId: data.id,
  });
  revalidateBanners();

  return { ok: true, banner: mapBanner(data), message: "Banner created." };
}

export async function updateAdminBanner(
  id: string,
  raw: unknown,
): Promise<BannerMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = bannerFormSchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid banner.");
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("banners")
    .update({
      title: values.title,
      description: values.description,
      image_path: values.imagePath,
      link_url: values.linkUrl,
      button_text: values.buttonText,
      is_active: values.isActive,
      starts_at: values.startsAt,
      ends_at: values.endsAt,
      sort_order: values.sortOrder,
    })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error || !data) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "UPDATE_BANNER",
      feature: "CMS",
      message: error?.message || "Unable to update banner",
      error,
      storeId,
      entityType: "banner",
      entityId: id,
      route: "/content/banners",
    });
  }

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BANNER_UPDATED",
    entityType: "banner",
    entityId: data.id,
  });
  revalidateBanners();

  return { ok: true, banner: mapBanner(data), message: "Banner updated." };
}

export async function deleteAdminBanner(
  id: string,
): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { error } = await supabase
    .from("banners")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "DELETE_BANNER",
      feature: "CMS",
      message: error.message || "Unable to delete banner",
      error,
      storeId,
      entityType: "banner",
      entityId: id,
      route: "/content/banners",
    });
  }

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BANNER_DELETED",
    entityType: "banner",
    entityId: id,
  });
  revalidateBanners();

  return { ok: true, message: "Banner deleted." };
}

export function toBannerFormValues(banner: BannerRow): BannerFormValues {
  return {
    title: banner.title,
    description: banner.description,
    imagePath: banner.imagePath,
    linkUrl: banner.linkUrl,
    buttonText: banner.buttonText,
    isActive: banner.isActive,
    startsAt: banner.startsAt,
    endsAt: banner.endsAt,
    sortOrder: banner.sortOrder,
  };
}
