"use server";

import { randomUUID } from "crypto";
import { requirePermission, getCurrentUser } from "@/features/auth/session";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { writeBrochureAudit } from "@/features/brochure/audit";
import {
  createBrochure,
  deleteBrochure,
  renameBrochure,
  setAdminBrochurePdfMaxMb,
  setBrochurePageDescription,
  updateBrochure,
} from "@/features/brochure/service";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { getImageUploadLimits } from "@/features/media/upload-limits.server";
import { ADMIN_BROCHURE_PDF_MAX_MB_DEFAULT } from "@/features/media/upload-limits";
import { assertSafeStorageSegment } from "@/features/media/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";

const ALLOWED_PDF_MIME = new Set(["application/pdf"]);

export async function createBrochureAction(input: unknown) {
  await requirePermission("content.create");
  return createBrochure(input);
}

export async function updateBrochureAction(id: string, input: unknown) {
  await requirePermission("content.update");
  return updateBrochure(id, input);
}

export async function renameBrochureAction(id: string, title: unknown) {
  await requirePermission("content.update");
  return renameBrochure(id, title);
}

export async function deleteBrochureAction(id: string) {
  await requirePermission("content.delete");
  return deleteBrochure(id);
}

export async function setAdminBrochurePdfMaxMbAction(mb: unknown) {
  await requirePermission("content.update");
  return setAdminBrochurePdfMaxMb(mb);
}

export async function setBrochurePageDescriptionAction(description: unknown) {
  await requirePermission("content.update");
  return setBrochurePageDescription(description);
}

export async function getAdminBrochurePdfMaxMbAction(): Promise<number> {
  const limits = await getImageUploadLimits();
  return limits.adminBrochurePdfMaxMb ?? ADMIN_BROCHURE_PDF_MAX_MB_DEFAULT;
}

export type UploadBrochurePdfResult =
  | { ok: true; path: string; url?: string; sizeBytes: number; message: string }
  | { ok: false; error: string };

export async function uploadBrochurePdfAction(
  formData: FormData,
): Promise<UploadBrochurePdfResult> {
  await requirePermission("content.create");
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const limits = await getImageUploadLimits(storeId);
  const maxBytes = limits.adminBrochurePdfMaxBytes;
  const maxMb = limits.adminBrochurePdfMaxMb;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a PDF file." };
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `PDF must be ${maxMb} MB or smaller.`,
    };
  }

  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (!ALLOWED_PDF_MIME.has(mime) && !name.endsWith(".pdf")) {
    return { ok: false, error: "Only PDF files are allowed." };
  }

  const fileId = randomUUID();
  if (!assertSafeStorageSegment(storeId) || !assertSafeStorageSegment(fileId)) {
    return { ok: false, error: "Unable to build storage path." };
  }

  const path = `brochures/${storeId}/${fileId}.pdf`;
  const supabase = await createSupabaseServerClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.brochures)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    return unexpectedFailure({
      type: "STORAGE",
      source: "SERVER",
      operation: "UPLOAD_BROCHURE_PDF",
      feature: "CMS",
      message:
        /bucket|not found|does not exist/i.test(error.message || "")
          ? "Brochure storage bucket is missing. Apply migration 20260925140000_store_brochures.sql, then try again."
          : error.message || "Unable to upload PDF",
      error,
      storeId,
      entityType: "store_brochure",
      route: "/content/brochures",
      metadata: { path, mime, size: file.size, maxMb },
    });
  }

  const user = await getCurrentUser();
  await writeBrochureAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BROCHURE_PDF_UPLOADED",
    entityType: "store_brochure",
    entityId: fileId,
    metadata: { path, size: file.size, maxMb },
  });

  return {
    ok: true,
    path,
    url: resolvePublicStorageUrl(STORAGE_BUCKETS.brochures, path) ?? undefined,
    sizeBytes: file.size,
    message: "PDF uploaded.",
  };
}
