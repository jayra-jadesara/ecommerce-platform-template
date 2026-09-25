import "server-only";

import { revalidatePath, unstable_cache } from "next/cache";
import { getAdminPath } from "@/config/admin-route";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import { writeBrochureAudit } from "@/features/brochure/audit";
import { normalizeBrochurePageDescription } from "@/features/brochure/page-description";
import {
  brochureCreateSchema,
  brochurePatchSchema,
  brochureTitleSchema,
} from "@/features/brochure/schemas";
import type {
  StoreBrochure,
  StorefrontBrochure,
} from "@/features/brochure/types";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { coerceAdminBrochurePdfMaxMb } from "@/features/media/upload-limits";
import { publishStorefrontSync } from "@/features/sync/server";
import { STOREFRONT_BROCHURE_CACHE_TAG } from "@/features/sync";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import { zodValidationFailure } from "@/lib/validation";
import type { Json, Tables, TablesUpdate } from "@/types/database";

type BrochureRow = Tables<"store_brochures">;

function mapBrochure(row: BrochureRow): StoreBrochure {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    pdfPath: row.pdf_path,
    fileSizeBytes: Number(row.file_size_bytes ?? 0),
    sortOrder: row.sort_order,
    isActive: row.is_active,
    downloadCount: Number(row.download_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function pdfPublicUrl(path: string): string {
  return resolvePublicStorageUrl(STORAGE_BUCKETS.brochures, path) ?? "";
}

async function revalidateBrochurePaths(storeId: string) {
  revalidatePath(getAdminPath("/content/brochures"));
  await publishStorefrontSync({
    storeId,
    topics: ["cms.brochure"],
  });
}

function getConfiguredStoreSlug(): string | null {
  const slug =
    process.env.STORE_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_STORE_SLUG?.trim() ||
    "";
  return slug || null;
}

async function resolveStorefrontStoreId(): Promise<string | null> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;
  const slug = getConfiguredStoreSlug();
  let query = supabase.from("stores").select("id").eq("status", "active").limit(1);
  if (slug) {
    query = supabase
      .from("stores")
      .select("id")
      .eq("status", "active")
      .eq("slug", slug)
      .limit(1);
  }
  const { data } = await query.maybeSingle();
  return data?.id ?? null;
}

export async function listAdminBrochures(): Promise<StoreBrochure[]> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("store_brochures")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) {
      console.error("[listAdminBrochures]", error.message, error.code);
    }
    return [];
  }
  return data.map(mapBrochure);
}

async function listStorefrontBrochuresUncached(
  storeId: string,
): Promise<StorefrontBrochure[]> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("store_brochures")
    .select("id, title, pdf_path, file_size_bytes")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .map((row) => {
      const pdfUrl = pdfPublicUrl(row.pdf_path);
      if (!pdfUrl) return null;
      return {
        id: row.id,
        title: row.title,
        pdfUrl,
        fileSizeBytes: Number(row.file_size_bytes ?? 0),
      };
    })
    .filter((item): item is StorefrontBrochure => Boolean(item));
}

export async function listStorefrontBrochures(): Promise<StorefrontBrochure[]> {
  const storeId = await resolveStorefrontStoreId();
  if (!storeId) return [];

  const cached = unstable_cache(
    () => listStorefrontBrochuresUncached(storeId),
    ["storefront-brochures", storeId],
    { revalidate: 60, tags: [STOREFRONT_BROCHURE_CACHE_TAG] },
  );
  return cached();
}

export async function getStorefrontBrochureForDownload(
  brochureId: string,
): Promise<{ id: string; pdfUrl: string; title: string } | null> {
  const id = brochureId.trim();
  if (!id) return null;

  const publicClient = createSupabasePublicClient();
  const supabase = publicClient ?? (await createSupabaseServerClient());

  const { data } = await supabase
    .from("store_brochures")
    .select("id, title, pdf_path, is_active")
    .eq("id", id)
    .maybeSingle();

  if (!data?.is_active || !data.pdf_path) return null;
  const pdfUrl = pdfPublicUrl(data.pdf_path);
  if (!pdfUrl) return null;
  return { id: data.id, title: data.title, pdfUrl };
}

export async function createBrochure(input: unknown): Promise<
  { ok: true; brochure: StoreBrochure; message: string } | { ok: false; error: string }
> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = brochureCreateSchema.safeParse(input);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid brochure.");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  const { data: maxRow, error: sortError } = await supabase
    .from("store_brochures")
    .select("sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sortError) {
    const raw = sortError.message || "Unable to save brochure";
    const friendly =
      sortError.code === "42P01" ||
      /relation .*store_brochures.* does not exist/i.test(raw) ||
      /Could not find the table/i.test(raw)
        ? "Brochure tables are not set up yet. Apply migration 20260925140000_store_brochures.sql, then try again."
        : raw;
    return { ok: false, error: friendly };
  }

  const sortOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("store_brochures")
    .insert({
      store_id: storeId,
      title: parsed.data.title,
      pdf_path: parsed.data.pdfPath,
      file_size_bytes: parsed.data.fileSizeBytes,
      sort_order: sortOrder,
      is_active: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code ?? "")
        : "";
    const raw = error?.message || "Unable to save brochure";
    const friendly =
      code === "42P01" || /relation .*store_brochures.* does not exist/i.test(raw)
        ? "Brochure storage is not set up yet. Apply the latest database migration, then try again."
        : raw;
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "CREATE_BROCHURE",
      feature: "CMS",
      message: friendly,
      error,
      storeId,
      entityType: "store_brochure",
      route: "/content/brochures",
      databaseCode: code || null,
    });
  }

  await writeBrochureAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BROCHURE_CREATED",
    entityType: "store_brochure",
    entityId: data.id,
    metadata: { title: parsed.data.title },
  });

  await revalidateBrochurePaths(storeId);
  return {
    ok: true,
    brochure: mapBrochure(data),
    message: "Brochure added.",
  };
}

export async function updateBrochure(
  id: string,
  input: unknown,
): Promise<
  { ok: true; brochure: StoreBrochure; message: string } | { ok: false; error: string }
> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = brochurePatchSchema.safeParse(input);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid brochure.");
  }

  const patch: TablesUpdate<"store_brochures"> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;
  if (!Object.keys(patch).length) {
    return { ok: false, error: "Nothing to update." };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("store_brochures")
    .update(patch)
    .eq("id", id)
    .eq("store_id", storeId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "UPDATE_BROCHURE",
      feature: "CMS",
      message: error?.message || "Unable to update brochure",
      error,
      storeId,
      entityType: "store_brochure",
      entityId: id,
      route: "/content/brochures",
    });
  }

  await writeBrochureAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BROCHURE_UPDATED",
    entityType: "store_brochure",
    entityId: data.id,
    metadata: patch as Json,
  });

  await revalidateBrochurePaths(storeId);
  return {
    ok: true,
    brochure: mapBrochure(data),
    message: "Brochure saved.",
  };
}

export async function renameBrochure(
  id: string,
  title: unknown,
): Promise<
  { ok: true; brochure: StoreBrochure; message: string } | { ok: false; error: string }
> {
  const parsed = brochureTitleSchema.safeParse(title);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a title.",
    };
  }
  return updateBrochure(id, { title: parsed.data });
}

export async function deleteBrochure(
  id: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  const { data: existing } = await supabase
    .from("store_brochures")
    .select("id, pdf_path")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Brochure not found." };

  const { error } = await supabase
    .from("store_brochures")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "DELETE_BROCHURE",
      feature: "CMS",
      message: error.message || "Unable to delete brochure",
      error,
      storeId,
      entityType: "store_brochure",
      entityId: id,
      route: "/content/brochures",
    });
  }

  if (existing.pdf_path) {
    await supabase.storage
      .from(STORAGE_BUCKETS.brochures)
      .remove([existing.pdf_path]);
  }

  await writeBrochureAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BROCHURE_DELETED",
    entityType: "store_brochure",
    entityId: id,
  });

  await revalidateBrochurePaths(storeId);
  return { ok: true, message: "Brochure deleted." };
}

export async function getBrochurePageDescription(): Promise<string> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return "";

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("store_settings")
    .select("brochure_page_description")
    .eq("store_id", storeId)
    .maybeSingle();

  return normalizeBrochurePageDescription(
    (data as { brochure_page_description?: string | null } | null)
      ?.brochure_page_description,
  );
}

export async function setBrochurePageDescription(
  description: unknown,
): Promise<{ ok: true; description: string } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const next = normalizeBrochurePageDescription(description);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  const { data: existing } = await supabase
    .from("store_settings")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("store_settings")
      .update({ brochure_page_description: next || null })
      .eq("store_id", storeId);
    if (error) {
      return unexpectedFailure({
        type: "DATABASE",
        source: "DATABASE",
        operation: "SET_BROCHURE_PAGE_DESCRIPTION",
        feature: "CMS",
        message: error.message || "Unable to save brochure intro",
        error,
        storeId,
        route: "/content/brochures",
      });
    }
  } else {
    const { error } = await supabase.from("store_settings").insert({
      store_id: storeId,
      brochure_page_description: next || null,
    });
    if (error) {
      return unexpectedFailure({
        type: "DATABASE",
        source: "DATABASE",
        operation: "SET_BROCHURE_PAGE_DESCRIPTION",
        feature: "CMS",
        message: error.message || "Unable to save brochure intro",
        error,
        storeId,
        route: "/content/brochures",
      });
    }
  }

  await writeBrochureAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BROCHURE_PAGE_DESCRIPTION_UPDATED",
    entityType: "store_brochure",
    entityId: storeId,
    metadata: { kind: "page_description", description: next },
  });

  await revalidateBrochurePaths(storeId);
  return { ok: true, description: next };
}

export async function setAdminBrochurePdfMaxMb(
  mb: unknown,
): Promise<{ ok: true; mb: number } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const next = coerceAdminBrochurePdfMaxMb(mb);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  const { data: existing } = await supabase
    .from("store_settings")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("store_settings")
      .update({ admin_brochure_pdf_max_mb: next })
      .eq("store_id", storeId);
    if (error) {
      return unexpectedFailure({
        type: "DATABASE",
        source: "DATABASE",
        operation: "SET_BROCHURE_PDF_MAX_MB",
        feature: "CMS",
        message: error.message || "Unable to save PDF size limit",
        error,
        storeId,
        route: "/content/brochures",
      });
    }
  } else {
    const { error } = await supabase.from("store_settings").insert({
      store_id: storeId,
      admin_brochure_pdf_max_mb: next,
    });
    if (error) {
      return unexpectedFailure({
        type: "DATABASE",
        source: "DATABASE",
        operation: "SET_BROCHURE_PDF_MAX_MB",
        feature: "CMS",
        message: error.message || "Unable to save PDF size limit",
        error,
        storeId,
        route: "/content/brochures",
      });
    }
  }

  await writeBrochureAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BROCHURE_PDF_MAX_MB_UPDATED",
    entityType: "store_brochure",
    entityId: storeId,
    metadata: { kind: "pdf_max_mb", mb: next },
  });

  return { ok: true, mb: next };
}
