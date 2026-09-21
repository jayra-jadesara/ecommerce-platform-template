import "server-only";

import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  ADMIN_IMAGE_MAX_MB_DEFAULT,
  REPLACE_PHOTO_MAX_MB_DEFAULT,
  coerceAdminImageMaxMb,
  coerceReplacePhotoMaxMb,
  mbToBytes,
} from "@/features/media/upload-limits";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export type ImageUploadLimits = {
  adminImageMaxMb: number;
  adminImageMaxBytes: number;
  replacePhotoMaxMb: number;
  replacePhotoMaxBytes: number;
};

const FALLBACK: ImageUploadLimits = {
  adminImageMaxMb: ADMIN_IMAGE_MAX_MB_DEFAULT,
  adminImageMaxBytes: mbToBytes(ADMIN_IMAGE_MAX_MB_DEFAULT),
  replacePhotoMaxMb: REPLACE_PHOTO_MAX_MB_DEFAULT,
  replacePhotoMaxBytes: mbToBytes(REPLACE_PHOTO_MAX_MB_DEFAULT),
};

/** Read configured upload limits for the active store (service role). */
export async function getImageUploadLimits(
  storeId?: string | null,
): Promise<ImageUploadLimits> {
  try {
    const id = storeId ?? (await resolveActiveStoreId());
    if (!id) return FALLBACK;

    const supabase = createSupabaseServiceClient();
    const [{ data: storeRow }, { data: shippingRow }] = await Promise.all([
      supabase
        .from("store_settings")
        .select("admin_image_max_mb")
        .eq("store_id", id)
        .maybeSingle(),
      supabase
        .from("shipping_settings")
        .select("replace_photo_max_mb")
        .eq("store_id", id)
        .maybeSingle(),
    ]);

    const adminMb = coerceAdminImageMaxMb(
      (storeRow as { admin_image_max_mb?: number } | null)?.admin_image_max_mb,
    );
    const replaceMb = coerceReplacePhotoMaxMb(
      (shippingRow as { replace_photo_max_mb?: number } | null)
        ?.replace_photo_max_mb,
    );

    return {
      adminImageMaxMb: adminMb,
      adminImageMaxBytes: mbToBytes(adminMb),
      replacePhotoMaxMb: replaceMb,
      replacePhotoMaxBytes: mbToBytes(replaceMb),
    };
  } catch {
    return FALLBACK;
  }
}

export async function getAdminImageMaxBytes(
  storeId?: string | null,
): Promise<number> {
  return (await getImageUploadLimits(storeId)).adminImageMaxBytes;
}

export async function getReplacePhotoMaxBytes(
  storeId?: string | null,
): Promise<number> {
  return (await getImageUploadLimits(storeId)).replacePhotoMaxBytes;
}
