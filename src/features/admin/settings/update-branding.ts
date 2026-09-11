import "server-only";

import { revalidateTag } from "next/cache";
import { getAdminPath } from "@/config/admin-route";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import {
  brandingSettingsSchema,
  type BrandingSettingsFormValues,
} from "@/features/admin/settings/schemas";
import {
  resolveActiveStoreId,
  type SettingsUpdateResult,
} from "@/features/admin/settings/store-context";
import {
  brandingObjectPath,
  diffChangedKeys,
  extensionFromMime,
  validateBrandingImageFile,
} from "@/features/admin/settings/validation";
import { STOREFRONT_CONFIG_CACHE_TAG } from "@/features/theme/service";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";

const BRANDING_ROUTE = getAdminPath("/settings/branding");

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function updateBrandingSettings(
  input: unknown,
): Promise<SettingsUpdateResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "branding.update")) {
    return {
      ok: false,
      error: "You do not have permission to update branding.",
    };
  }

  const parsed = brandingSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid branding settings.",
    };
  }

  const values: BrandingSettingsFormValues = parsed.data;
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const payload = {
    brand_name: values.brandName.trim(),
    tagline: emptyToNull(values.tagline),
    logo_path: emptyToNull(values.logoPath),
    logo_dark_path: emptyToNull(values.logoDarkPath),
    favicon_path: emptyToNull(values.faviconPath),
    social_sharing_image_path: emptyToNull(values.socialSharingImagePath),
  };

  const { data: existing } = await supabase
    .from("store_branding")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  const write = existing
    ? await supabase
        .from("store_branding")
        .update(payload)
        .eq("store_id", storeId)
    : await supabase.from("store_branding").insert({
        store_id: storeId,
        ...payload,
      });

  if (write.error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "BRANDING_UPDATE",
      feature: "BRANDING",
      message: "Unable to save branding",
      error: write.error,
      databaseCode: write.error.code,
      storeId,
      entityType: "store_branding",
      entityId: storeId,
      route: BRANDING_ROUTE,
    });
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "BRANDING_UPDATED",
    entity_type: "store_branding",
    entity_id: storeId,
    metadata: {
      changed_fields: diffChangedKeys(
        (existing as Record<string, unknown> | null) ?? {},
        payload as Record<string, unknown>,
      ),
    },
  });

  revalidateTag(STOREFRONT_CONFIG_CACHE_TAG, "max");
  return { ok: true, message: "Branding saved." };
}

export type BrandingUploadKind =
  | "logo"
  | "dark-logo"
  | "favicon"
  | "social-image";

export async function uploadBrandingImage(
  kind: BrandingUploadKind,
  formData: FormData,
): Promise<SettingsUpdateResult & { path?: string }> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "branding.update")) {
    return {
      ok: false,
      error: "You do not have permission to upload branding images.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No image file provided." };
  }

  const validation = validateBrandingImageFile({
    type: file.type,
    size: file.size,
    name: file.name,
  });
  if (!validation.ok) return validation;

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const ext = extensionFromMime(file.type);
  const path = brandingObjectPath(storeId, kind, ext);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.branding)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });

  if (error) {
    return unexpectedFailure({
      type: "STORAGE",
      source: "SERVER",
      operation: "BRANDING_UPLOAD",
      feature: "BRANDING",
      message: "Unable to upload branding image",
      error,
      storeId,
      entityType: "store_branding",
      entityId: storeId,
      route: BRANDING_ROUTE,
      metadata: {
        asset_type: kind,
        bucket: STORAGE_BUCKETS.branding,
        path,
      },
    });
  }

  return { ok: true, message: "Image uploaded.", path };
}
