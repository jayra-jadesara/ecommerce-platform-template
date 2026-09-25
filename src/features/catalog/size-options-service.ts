import "server-only";

import { getAdminPath } from "@/config/admin-route";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { publishStorefrontSync } from "@/features/sync/server";
import { PRODUCT_SIZE_OPTIONS } from "@/features/catalog/validation";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { zodValidationFailure } from "@/lib/validation";
import { mapDatabaseConstraintError } from "@/lib/validation/db-errors";
import { z } from "zod";

export type CatalogSizeResult =
  | { ok: true; message: string; id?: string }
  | {
      ok: false;
      error: string;
      referenceId?: string;
      kind?: "validation" | "error";
      fieldErrors?: Record<string, string>;
    };

const SIZES_ROUTE = getAdminPath("/catalog/sizes");
const SIZE_OPTIONS_TAG = "catalog-size-options";

export type SizeOptionRow = {
  id: string;
  store_id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const sizeOptionFormSchema = z.object({
  label: z.string().trim().min(1, "Size / pack is required").max(80),
  isActive: z.boolean().default(true),
});

export type SizeOptionFormValues = z.infer<typeof sizeOptionFormSchema>;

async function revalidateSizeOptions(storeId: string) {
  await publishStorefrontSync({
    storeId,
    topics: ["catalog.products"],
    extraTags: [SIZE_OPTIONS_TAG],
  });
}

export async function listAdminSizeOptions(opts?: {
  activeOnly?: boolean;
}): Promise<SizeOptionRow[]> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "products.view")) return [];

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return [];

  let query = supabase
    .from("product_size_options")
    .select("*")
    .eq("store_id", storeId)
    .order("label", { ascending: true });

  if (opts?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as SizeOptionRow[];
}

export async function createSizeOption(
  input: unknown,
): Promise<CatalogSizeResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "products.update")) {
    return { ok: false, error: "You don't have permission to add sizes." };
  }

  const parsed = sizeOptionFormSchema.safeParse(input);
  if (!parsed.success) {
    const failure = zodValidationFailure(parsed.error, "Invalid size.");
    return {
      ok: false,
      kind: "validation",
      error: failure.error,
      fieldErrors: failure.fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return { ok: false, error: "No active store found." };
  }

  const { count } = await supabase
    .from("product_size_options")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  const { data, error } = await supabase
    .from("product_size_options")
    .insert({
      store_id: storeId,
      label: parsed.data.label,
      sort_order: count ?? 0,
      is_active: parsed.data.isActive,
    })
    .select("id")
    .single();

  if (error) {
    const mapped = mapDatabaseConstraintError(error, {
      entity: "size",
      uniqueHint: "That size / pack already exists.",
    });
    if (mapped) {
      return { ok: false, kind: "validation", error: mapped.message };
    }
    return unexpectedFailure({
      type: "DATABASE",
      operation: "CREATE_SIZE_OPTION",
      feature: "CATALOG",
      route: SIZES_ROUTE,
      error,
      storeId,
    });
  }

  await revalidateSizeOptions(storeId);
  return { ok: true, message: "Size added.", id: data.id };
}

export async function updateSizeOption(
  id: string,
  input: unknown,
): Promise<CatalogSizeResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "products.update")) {
    return { ok: false, error: "You don't have permission to update sizes." };
  }

  const parsed = sizeOptionFormSchema.safeParse(input);
  if (!parsed.success) {
    const failure = zodValidationFailure(parsed.error, "Invalid size.");
    return {
      ok: false,
      kind: "validation",
      error: failure.error,
      fieldErrors: failure.fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return { ok: false, error: "No active store found." };
  }

  const { error } = await supabase
    .from("product_size_options")
    .update({
      label: parsed.data.label,
      is_active: parsed.data.isActive,
    })
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    const mapped = mapDatabaseConstraintError(error, {
      entity: "size",
      uniqueHint: "That size / pack already exists.",
    });
    if (mapped) {
      return { ok: false, kind: "validation", error: mapped.message };
    }
    return unexpectedFailure({
      type: "DATABASE",
      operation: "UPDATE_SIZE_OPTION",
      feature: "CATALOG",
      entityType: "product_size_options",
      entityId: id,
      route: SIZES_ROUTE,
      error,
      storeId,
    });
  }

  await revalidateSizeOptions(storeId);
  return { ok: true, message: "Size updated." };
}

export async function deleteSizeOption(id: string): Promise<CatalogSizeResult> {
  const admin = await getCurrentAdmin();
  if (
    !admin ||
    !(
      hasPermission(admin, "products.update") ||
      hasPermission(admin, "products.delete")
    )
  ) {
    return { ok: false, error: "You don't have permission to delete sizes." };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return { ok: false, error: "No active store found." };
  }

  const { error } = await supabase
    .from("product_size_options")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    return unexpectedFailure({
      type: "DATABASE",
      operation: "DELETE_SIZE_OPTION",
      feature: "CATALOG",
      entityType: "product_size_options",
      entityId: id,
      route: SIZES_ROUTE,
      error,
      storeId,
    });
  }

  await revalidateSizeOptions(storeId);
  return { ok: true, message: "Size removed." };
}

export async function deleteSizeOptions(
  ids: string[],
): Promise<CatalogSizeResult> {
  const admin = await getCurrentAdmin();
  if (
    !admin ||
    !(
      hasPermission(admin, "products.update") ||
      hasPermission(admin, "products.delete")
    )
  ) {
    return { ok: false, error: "You don't have permission to delete sizes." };
  }

  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: false, error: "Select at least one size to delete." };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return { ok: false, error: "No active store found." };
  }

  const { error } = await supabase
    .from("product_size_options")
    .delete()
    .eq("store_id", storeId)
    .in("id", uniqueIds);

  if (error) {
    return unexpectedFailure({
      type: "DATABASE",
      operation: "DELETE_SIZE_OPTIONS",
      feature: "CATALOG",
      entityType: "product_size_options",
      route: SIZES_ROUTE,
      error,
      storeId,
      metadata: { count: uniqueIds.length },
    });
  }

  await revalidateSizeOptions(storeId);
  return {
    ok: true,
    message:
      uniqueIds.length === 1
        ? "Size removed."
        : `Removed ${uniqueIds.length} sizes.`,
  };
}

/** Insert the built-in common sizes when the master list is empty. */
export async function seedDefaultSizeOptions(): Promise<CatalogSizeResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "products.update")) {
    return { ok: false, error: "You don't have permission to add sizes." };
  }

  const existing = await listAdminSizeOptions();
  if (existing.length > 0) {
    return { ok: false, error: "Size list already has entries." };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) {
    return { ok: false, error: "No active store found." };
  }

  const rows = PRODUCT_SIZE_OPTIONS.map((label, index) => ({
    store_id: storeId,
    label,
    sort_order: index,
    is_active: true,
  }));

  const { error } = await supabase.from("product_size_options").insert(rows);
  if (error) {
    return unexpectedFailure({
      type: "DATABASE",
      operation: "SEED_SIZE_OPTIONS",
      feature: "CATALOG",
      route: SIZES_ROUTE,
      error,
      storeId,
    });
  }

  await revalidateSizeOptions(storeId);
  return {
    ok: true,
    message: `Added ${rows.length} common sizes.`,
  };
}

export { SIZES_ROUTE };
