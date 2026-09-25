import "server-only";

import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  ADMIN_BROCHURE_PDF_MAX_MB_DEFAULT,
  ADMIN_IMAGE_MAX_MB_DEFAULT,
  ADMIN_REEL_VIDEO_MAX_MB_DEFAULT,
  REPLACE_PHOTO_MAX_MB_DEFAULT,
  coerceAdminBrochurePdfMaxMb,
  coerceAdminImageMaxMb,
  coerceAdminReelVideoMaxMb,
  coerceReplacePhotoMaxMb,
  mbToBytes,
} from "@/features/media/upload-limits";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export type ImageUploadLimits = {
  adminImageMaxMb: number;
  adminImageMaxBytes: number;
  replacePhotoMaxMb: number;
  replacePhotoMaxBytes: number;
  adminReelVideoMaxMb: number;
  adminReelVideoMaxBytes: number;
  adminBrochurePdfMaxMb: number;
  adminBrochurePdfMaxBytes: number;
};

const FALLBACK: ImageUploadLimits = {
  adminImageMaxMb: ADMIN_IMAGE_MAX_MB_DEFAULT,
  adminImageMaxBytes: mbToBytes(ADMIN_IMAGE_MAX_MB_DEFAULT),
  replacePhotoMaxMb: REPLACE_PHOTO_MAX_MB_DEFAULT,
  replacePhotoMaxBytes: mbToBytes(REPLACE_PHOTO_MAX_MB_DEFAULT),
  adminReelVideoMaxMb: ADMIN_REEL_VIDEO_MAX_MB_DEFAULT,
  adminReelVideoMaxBytes: mbToBytes(ADMIN_REEL_VIDEO_MAX_MB_DEFAULT),
  adminBrochurePdfMaxMb: ADMIN_BROCHURE_PDF_MAX_MB_DEFAULT,
  adminBrochurePdfMaxBytes: mbToBytes(ADMIN_BROCHURE_PDF_MAX_MB_DEFAULT),
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
        .select(
          "admin_image_max_mb, admin_reel_video_max_mb, admin_brochure_pdf_max_mb",
        )
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
    const reelMb = coerceAdminReelVideoMaxMb(
      (storeRow as { admin_reel_video_max_mb?: number } | null)
        ?.admin_reel_video_max_mb,
    );
    const brochureMb = coerceAdminBrochurePdfMaxMb(
      (storeRow as { admin_brochure_pdf_max_mb?: number } | null)
        ?.admin_brochure_pdf_max_mb,
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
      adminReelVideoMaxMb: reelMb,
      adminReelVideoMaxBytes: mbToBytes(reelMb),
      adminBrochurePdfMaxMb: brochureMb,
      adminBrochurePdfMaxBytes: mbToBytes(brochureMb),
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

export async function getAdminReelVideoMaxBytes(
  storeId?: string | null,
): Promise<number> {
  return (await getImageUploadLimits(storeId)).adminReelVideoMaxBytes;
}

export async function getAdminBrochurePdfMaxBytes(
  storeId?: string | null,
): Promise<number> {
  return (await getImageUploadLimits(storeId)).adminBrochurePdfMaxBytes;
}
