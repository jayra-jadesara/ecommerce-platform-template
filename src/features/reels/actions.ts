"use server";

import { randomUUID } from "crypto";
import { requirePermission } from "@/features/auth/session";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import {
  createAdminReel,
  deleteAdminReel,
  patchAdminReel,
  reorderAdminReels,
  setAdminReelVideoMaxMb,
  setReelsAutoplayMuted,
  setReelsProductCtaLabel,
  setReelsProductPageHeading,
  setReelsShowcaseLimit,
  setReelsVisibleSlides,
  updateAdminReel,
} from "@/features/reels/reels-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import { assertSafeStorageSegment } from "@/features/media/validation";
import { getImageUploadLimits } from "@/features/media/upload-limits.server";
import {
  ADMIN_REEL_VIDEO_MAX_MB_DEFAULT,
  isValidReelAspectRatio,
} from "@/features/media/upload-limits";

const ALLOWED_VIDEO_MIME = new Set(["video/mp4", "video/webm"]);

export async function createReelAction(raw: unknown) {
  await requirePermission("content.create");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "CREATE_REEL",
      feature: "CMS",
      entityType: "store_reel",
      route: "/content/reels",
    },
    () => createAdminReel(raw),
  );
}

export async function updateReelAction(id: string, raw: unknown) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_REEL",
      feature: "CMS",
      entityType: "store_reel",
      entityId: id,
      route: "/content/reels",
    },
    () => updateAdminReel(id, raw),
  );
}

export async function patchReelAction(id: string, raw: unknown) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "PATCH_REEL",
      feature: "CMS",
      entityType: "store_reel",
      entityId: id,
      route: "/content/reels",
    },
    () => patchAdminReel(id, raw),
  );
}

export async function updateReelsProductCtaLabelAction(label: unknown) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_REELS_PRODUCT_CTA",
      feature: "CMS",
      entityType: "store_settings",
      route: "/content/reels",
    },
    () => setReelsProductCtaLabel(label),
  );
}

export async function updateReelsShowcaseLimitAction(limit: unknown) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_REELS_SHOWCASE_LIMIT",
      feature: "CMS",
      entityType: "store_settings",
      route: "/content/reels",
    },
    () => setReelsShowcaseLimit(limit),
  );
}

export async function updateReelsAutoplayMutedAction(enabled: unknown) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_REELS_AUTOPLAY",
      feature: "CMS",
      entityType: "store_settings",
      route: "/content/reels",
    },
    () => setReelsAutoplayMuted(enabled),
  );
}

export async function updateReelsProductPageHeadingAction(heading: unknown) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_REELS_PRODUCT_PAGE_HEADING",
      feature: "CMS",
      entityType: "store_settings",
      route: "/content/reels",
    },
    () => setReelsProductPageHeading(heading),
  );
}

export async function updateReelsVisibleSlidesAction(slides: unknown) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_REELS_VISIBLE_SLIDES",
      feature: "CMS",
      entityType: "store_settings",
      route: "/content/reels",
    },
    () => setReelsVisibleSlides(slides),
  );
}

export async function updateAdminReelVideoMaxMbAction(mb: unknown) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_ADMIN_REEL_VIDEO_MAX_MB",
      feature: "CMS",
      entityType: "store_settings",
      route: "/content/reels",
    },
    () => setAdminReelVideoMaxMb(mb),
  );
}

export async function reorderReelsAction(orderedIds: string[]) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "REORDER_REELS",
      feature: "CMS",
      entityType: "store_reel",
      route: "/content/reels",
    },
    () => reorderAdminReels(orderedIds),
  );
}

export async function deleteReelAction(id: string) {
  await requirePermission("content.delete");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "DELETE_REEL",
      feature: "CMS",
      entityType: "store_reel",
      entityId: id,
      route: "/content/reels",
    },
    () => deleteAdminReel(id),
  );
}

export type UploadReelVideoResult =
  | { ok: true; path: string; url?: string; message: string }
  | { ok: false; error: string };

export async function uploadReelVideoAction(
  formData: FormData,
): Promise<UploadReelVideoResult> {
  await requirePermission("content.create");
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const limits = await getImageUploadLimits(storeId);
  const maxBytes = limits.adminReelVideoMaxBytes;
  const maxMb = limits.adminReelVideoMaxMb;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an MP4 or WebM video." };
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `Video must be ${maxMb} MB or smaller.`,
    };
  }

  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_VIDEO_MIME.has(mime)) {
    return { ok: false, error: "Only MP4 or WebM videos are allowed." };
  }

  const widthRaw = formData.get("width");
  const heightRaw = formData.get("height");
  const width =
    typeof widthRaw === "string" ? Number(widthRaw) : Number(widthRaw);
  const height =
    typeof heightRaw === "string" ? Number(heightRaw) : Number(heightRaw);

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return {
      ok: false,
      error: "Could not read video dimensions. Try another MP4.",
    };
  }
  if (!isValidReelAspectRatio(width, height)) {
    return {
      ok: false,
      error:
        "Video must be vertical reel ratio (~9:16). Landscape or square files are not allowed.",
    };
  }

  const ext = mime === "video/webm" ? "webm" : "mp4";
  const fileId = randomUUID();
  if (!assertSafeStorageSegment(storeId) || !assertSafeStorageSegment(fileId)) {
    return { ok: false, error: "Unable to build storage path." };
  }

  const path = `reels/${storeId}/videos/${fileId}.${ext}`;
  const supabase = await createSupabaseServerClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.reels)
    .upload(path, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (error) {
    return unexpectedFailure({
      type: "STORAGE",
      source: "SERVER",
      operation: "UPLOAD_REEL_VIDEO",
      feature: "CMS",
      message: error.message || "Unable to upload video",
      error,
      storeId,
      entityType: "store_reel",
      route: "/content/reels",
      metadata: { path, mime, size: file.size, maxMb },
    });
  }

  return {
    ok: true,
    path,
    url: resolvePublicStorageUrl(STORAGE_BUCKETS.reels, path),
    message: "Video uploaded.",
  };
}

/** Current admin reel video upload max (MB) for client UI. */
export async function getAdminReelVideoMaxMbAction(): Promise<number> {
  const limits = await getImageUploadLimits();
  return limits.adminReelVideoMaxMb ?? ADMIN_REEL_VIDEO_MAX_MB_DEFAULT;
}
