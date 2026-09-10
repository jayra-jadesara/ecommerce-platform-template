import "server-only";

import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { STOREFRONT_CONFIG_CACHE_TAG } from "@/features/theme/service";
import {
  assertSafeStoragePath,
  bucketForFolder,
  buildGeneralMediaPath,
  MEDIA_FOLDERS,
  validateImageUpload,
  type MediaFolder,
} from "@/features/media/validation";

export type MediaResult =
  | { ok: true; message: string; id?: string; path?: string; url?: string }
  | { ok: false; error: string };

export type MediaRow = {
  id: string;
  store_id: string;
  storage_path: string;
  public_url: string | null;
  file_name: string;
  mime_type: string;
  file_size: number | null;
  alt_text: string | null;
  folder: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  /** Admin UI preview (public URL or short-lived signed URL). Not persisted. */
  preview_url?: string | null;
};

export type MediaListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  folder?: MediaFolder | "all";
};

function normalizeFolder(value: string | null | undefined): MediaFolder {
  if (value && (MEDIA_FOLDERS as readonly string[]).includes(value)) {
    return value as MediaFolder;
  }
  return "general";
}

async function attachPreviewUrls(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  items: MediaRow[],
): Promise<MediaRow[]> {
  if (!items.length) return items;

  const privatePaths: string[] = [];
  for (const item of items) {
    const bucket = bucketForFolder(normalizeFolder(item.folder));
    if (bucket === STORAGE_BUCKETS.media) {
      privatePaths.push(item.storage_path);
    }
  }

  const signedByPath = new Map<string, string>();
  if (privatePaths.length) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKETS.media)
      .createSignedUrls(privatePaths, 60 * 60);
    (data ?? []).forEach((entry, index) => {
      if (!entry?.signedUrl) return;
      const original = privatePaths[index];
      if (original) signedByPath.set(original, entry.signedUrl);
      if (entry.path) signedByPath.set(entry.path, entry.signedUrl);
    });
  }

  return items.map((item) => {
    const folder = normalizeFolder(item.folder);
    const bucket = bucketForFolder(folder);
    if (bucket === STORAGE_BUCKETS.media) {
      return {
        ...item,
        preview_url: signedByPath.get(item.storage_path) ?? null,
      };
    }
    const publicUrl =
      item.public_url ||
      resolvePublicStorageUrl(bucket, item.storage_path) ||
      null;
    return { ...item, preview_url: publicUrl };
  });
}

export async function listMedia(
  raw: MediaListQuery = {},
): Promise<{ items: MediaRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, raw.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, raw.pageSize ?? 24));
  const empty = { items: [] as MediaRow[], total: 0, page, pageSize };

  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "media.view")) return empty;

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return empty;

  let query = supabase
    .from("media")
    .select("*", { count: "exact" })
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (raw.folder && raw.folder !== "all") {
    query = query.eq("folder", raw.folder);
  }
  if (raw.q?.trim()) {
    const term = raw.q.trim().replace(/[%_,]/g, " ");
    query = query.or(
      `file_name.ilike.%${term}%,alt_text.ilike.%${term}%,storage_path.ilike.%${term}%`,
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error || !data) return empty;

  const items = await attachPreviewUrls(supabase, data as MediaRow[]);

  return {
    items,
    total: count ?? data.length,
    page,
    pageSize,
  };
}

export async function uploadMedia(
  formData: FormData,
): Promise<MediaResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "media.upload")) {
    return { ok: false, error: "You do not have permission to upload media." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No image file provided." };
  }

  const folder = normalizeFolder(String(formData.get("folder") ?? "general"));
  const altText = String(formData.get("altText") ?? "").trim() || null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateImageUpload({
    declaredMime: file.type,
    size: file.size,
    fileName: file.name,
    bytes: new Uint8Array(buffer),
  });
  if (!validation.ok) return validation;

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const fileId = randomUUID();
  const path = buildGeneralMediaPath({
    storeId,
    folder,
    fileId,
    ext: validation.ext,
  });
  if (!assertSafeStoragePath(path)) {
    return { ok: false, error: "Invalid storage path." };
  }

  const bucket = bucketForFolder(folder);
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: validation.mime,
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      ok: false,
      error: "Unable to upload file. Check storage permissions and try again.",
    };
  }

  const publicUrl =
    bucket === STORAGE_BUCKETS.media
      ? null
      : resolvePublicStorageUrl(bucket, path) ?? null;

  const { data, error } = await supabase
    .from("media")
    .insert({
      store_id: storeId,
      storage_path: path,
      public_url: publicUrl,
      file_name: file.name.slice(0, 240),
      mime_type: validation.mime,
      file_size: file.size,
      alt_text: altText,
      folder,
      uploaded_by: admin.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    await supabase.storage.from(bucket).remove([path]);
    return { ok: false, error: "Unable to save media metadata." };
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "MEDIA_UPLOADED",
    entity_type: "media",
    entity_id: data.id,
    metadata: { path, folder, mime: validation.mime, size: file.size },
  });

  if (folder === "branding") {
    revalidateTag(STOREFRONT_CONFIG_CACHE_TAG, "max");
  }

  return {
    ok: true,
    message: "Media uploaded.",
    id: data.id,
    path,
    url: publicUrl ?? undefined,
  };
}

export async function updateMediaMeta(
  id: string,
  input: { altText?: string | null },
): Promise<MediaResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "media.update")) {
    return { ok: false, error: "You do not have permission to update media." };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const { error } = await supabase
    .from("media")
    .update({ alt_text: input.altText?.trim() || null })
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) return { ok: false, error: "Unable to update media." };
  return { ok: true, message: "Media updated.", id };
}

export async function deleteMedia(id: string): Promise<MediaResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "media.delete")) {
    return { ok: false, error: "You do not have permission to delete media." };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const { data: row } = await supabase
    .from("media")
    .select("*")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Media item not found." };

  const folder = normalizeFolder(row.folder);
  const bucket = bucketForFolder(folder);

  // Avoid deleting storage if another media row shares the same path.
  const { count } = await supabase
    .from("media")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("storage_path", row.storage_path);

  const { error } = await supabase
    .from("media")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) return { ok: false, error: "Unable to delete media metadata." };

  if ((count ?? 0) <= 1 && assertSafeStoragePath(row.storage_path)) {
    await supabase.storage.from(bucket).remove([row.storage_path]);
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "MEDIA_DELETED",
    entity_type: "media",
    entity_id: id,
    metadata: { path: row.storage_path, folder },
  });

  if (folder === "branding") {
    revalidateTag(STOREFRONT_CONFIG_CACHE_TAG, "max");
  }

  return { ok: true, message: "Media deleted." };
}
