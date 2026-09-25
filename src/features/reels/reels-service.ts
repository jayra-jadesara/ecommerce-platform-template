import "server-only";

import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import { writeContentAudit } from "@/features/cms/audit";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { listStorefrontProductsByIds } from "@/features/catalog/storefront";
import {
  clampReelShowcaseLimit,
  clampReelVisibleSlides,
  normalizeReelProductPageHeading,
  REEL_PRODUCT_PAGE_HEADING_DEFAULT,
  REEL_SHOWCASE_LIMIT_DEFAULT,
  REEL_VISIBLE_SLIDES_DEFAULT,
  reelFormSchema,
  reelGridPatchSchema,
  reelProductCtaLabelSchema,
  reelProductPageHeadingSchema,
  toInstagramPermalink,
  type ReelFormValues,
  type ReelGridPatch,
  type ReelProductCtaLabel,
} from "@/features/reels/schemas";
import type { StoreReel, StorefrontReel } from "@/features/reels/types";
import { publishStorefrontSync } from "@/features/sync/server";
import { coerceAdminReelVideoMaxMb } from "@/features/media/upload-limits";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import { zodValidationFailure, type FieldErrors } from "@/lib/validation";
import type { Tables, TablesUpdate } from "@/types/database";

type ReelRow = Tables<"store_reels">;
type ReelProductRow = Tables<"store_reel_products">;

const DEFAULT_PRODUCT_CTA: ReelProductCtaLabel = "Shop";

function mapReel(row: ReelRow, productIds: string[] = []): StoreReel {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    instagramUrl: row.instagram_url,
    videoPath: row.video_path,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    showOnHome: row.show_on_home,
    showOnProductPage: row.show_on_product_page ?? true,
    productIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function revalidateReels(storeId?: string) {
  const id = storeId ?? (await resolveActiveStoreId());
  if (!id) return;
  await publishStorefrontSync({
    storeId: id,
    topics: ["cms.reels"],
  });
}

function resolveMediaUrl(path: string | null | undefined): string | undefined {
  if (!path?.trim()) return undefined;
  const normalized = path.trim().replace(/^\/+/, "");
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const inferred = normalized.split("/")[0]?.toLowerCase();
  if (inferred === STORAGE_BUCKETS.reels) {
    return resolvePublicStorageUrl(STORAGE_BUCKETS.reels, path);
  }
  if (inferred === STORAGE_BUCKETS.cms) {
    return resolvePublicStorageUrl(STORAGE_BUCKETS.cms, path);
  }
  if (inferred === STORAGE_BUCKETS.products) {
    return resolvePublicStorageUrl(STORAGE_BUCKETS.products, path);
  }
  return (
    resolvePublicStorageUrl(STORAGE_BUCKETS.reels, path) ||
    resolvePublicStorageUrl(STORAGE_BUCKETS.cms, path)
  );
}

async function loadProductIdsByReel(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  reelIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!reelIds.length) return map;
  const { data } = await supabase
    .from("store_reel_products")
    .select("reel_id, product_id, sort_order")
    .in("reel_id", reelIds)
    .order("sort_order", { ascending: true });
  for (const row of (data ?? []) as ReelProductRow[]) {
    const list = map.get(row.reel_id) ?? [];
    list.push(row.product_id);
    map.set(row.reel_id, list);
  }
  return map;
}

async function syncReelProducts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  reelId: string,
  productIds: string[],
) {
  await supabase.from("store_reel_products").delete().eq("reel_id", reelId);
  if (productIds.length === 0) return;
  await supabase.from("store_reel_products").insert(
    productIds.map((productId, index) => ({
      reel_id: reelId,
      product_id: productId,
      sort_order: index,
    })),
  );
}

export async function listAdminReels(): Promise<StoreReel[]> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("store_reels")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as ReelRow[];
  const productMap = await loadProductIdsByReel(
    supabase,
    rows.map((r) => r.id),
  );
  return rows.map((row) => mapReel(row, productMap.get(row.id) ?? []));
}

export type ReelMutationResult =
  | { ok: true; reel: StoreReel; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export async function createAdminReel(
  raw: unknown,
): Promise<ReelMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = reelFormSchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid reel.");
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("store_reels")
    .insert({
      store_id: storeId,
      title: values.title,
      instagram_url: toInstagramPermalink(values.instagramUrl),
      video_path: values.videoPath,
      sort_order: 0,
      is_active: true,
      show_on_home: true,
      show_on_product_page: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "CREATE_REEL",
      feature: "CMS",
      message: error?.message || "Unable to create reel",
      error,
      storeId,
      entityType: "store_reel",
      route: "/content/reels",
    });
  }

  await syncReelProducts(supabase, data.id, values.productIds);

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BANNER_CREATED",
    entityType: "banner",
    entityId: data.id,
    metadata: { kind: "reel" },
  });
  await revalidateReels(storeId);

  return {
    ok: true,
    reel: mapReel(data as ReelRow, values.productIds),
    message: "Reel created.",
  };
}

export async function updateAdminReel(
  id: string,
  raw: unknown,
): Promise<ReelMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = reelFormSchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid reel.");
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("store_reels")
    .update({
      title: values.title,
      instagram_url: toInstagramPermalink(values.instagramUrl),
      video_path: values.videoPath,
    })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error || !data) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "UPDATE_REEL",
      feature: "CMS",
      message: error?.message || "Unable to update reel",
      error,
      storeId,
      entityType: "store_reel",
      entityId: id,
      route: "/content/reels",
    });
  }

  await syncReelProducts(supabase, data.id, values.productIds);

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BANNER_UPDATED",
    entityType: "banner",
    entityId: data.id,
    metadata: { kind: "reel" },
  });
  await revalidateReels(storeId);

  return {
    ok: true,
    reel: mapReel(data as ReelRow, values.productIds),
    message: "Reel updated.",
  };
}

export async function deleteAdminReel(
  id: string,
): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { error } = await supabase
    .from("store_reels")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "DELETE_REEL",
      feature: "CMS",
      message: error.message || "Unable to delete reel",
      error,
      storeId,
      entityType: "store_reel",
      entityId: id,
      route: "/content/reels",
    });
  }

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "BANNER_DELETED",
    entityType: "banner",
    entityId: id,
    metadata: { kind: "reel" },
  });
  await revalidateReels(storeId);

  return { ok: true, message: "Reel deleted." };
}

export async function patchAdminReel(
  id: string,
  raw: unknown,
): Promise<ReelMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = reelGridPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid reel update.");
  }

  const patch = parsed.data;
  if (
    patch.isActive === undefined &&
    patch.showOnHome === undefined &&
    patch.showOnProductPage === undefined &&
    patch.sortOrder === undefined
  ) {
    return { ok: false, error: "Nothing to update." };
  }

  const supabase = await createSupabaseServerClient();
  const update: TablesUpdate<"store_reels"> = {};
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  if (patch.showOnHome !== undefined) update.show_on_home = patch.showOnHome;
  if (patch.showOnProductPage !== undefined) {
    update.show_on_product_page = patch.showOnProductPage;
  }
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;

  const { data, error } = await supabase
    .from("store_reels")
    .update(update)
    .eq("id", id)
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error || !data) {
    return unexpectedFailure({
      type: "CMS",
      source: "DATABASE",
      operation: "PATCH_REEL",
      feature: "CMS",
      message: error?.message || "Unable to update reel",
      error,
      storeId,
      entityType: "store_reel",
      entityId: id,
      route: "/content/reels",
    });
  }

  const productMap = await loadProductIdsByReel(supabase, [data.id]);
  await revalidateReels(storeId);
  return {
    ok: true,
    reel: mapReel(data as ReelRow, productMap.get(data.id) ?? []),
    message: "Reel updated.",
  };
}

export async function getReelsShowcaseSettings(
  storeId?: string | null,
): Promise<{
  productCtaLabel: ReelProductCtaLabel;
  showcaseLimit: number;
  autoplayMuted: boolean;
  productPageHeading: string;
  visibleSlides: number;
}> {
  const resolved = storeId ?? (await resolveActiveStoreId());
  if (!resolved) {
    return {
      productCtaLabel: DEFAULT_PRODUCT_CTA,
      showcaseLimit: REEL_SHOWCASE_LIMIT_DEFAULT,
      autoplayMuted: true,
      productPageHeading: REEL_PRODUCT_PAGE_HEADING_DEFAULT,
      visibleSlides: REEL_VISIBLE_SLIDES_DEFAULT,
    };
  }

  const publicClient = createSupabasePublicClient();
  const supabase = publicClient ?? (await createSupabaseServerClient());
  const { data } = await supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", resolved)
    .maybeSingle();

  const row = (data ?? null) as {
    reels_product_cta_label?: string | null;
    reels_showcase_limit?: number | null;
    reels_autoplay_muted?: boolean | null;
    reels_product_page_heading?: string | null;
    reels_visible_slides?: number | null;
  } | null;

  const parsed = reelProductCtaLabelSchema.safeParse(
    row?.reels_product_cta_label,
  );
  return {
    productCtaLabel: parsed.success ? parsed.data : DEFAULT_PRODUCT_CTA,
    showcaseLimit: clampReelShowcaseLimit(row?.reels_showcase_limit),
    autoplayMuted:
      typeof row?.reels_autoplay_muted === "boolean"
        ? row.reels_autoplay_muted
        : true,
    productPageHeading: normalizeReelProductPageHeading(
      row?.reels_product_page_heading,
    ),
    visibleSlides: clampReelVisibleSlides(row?.reels_visible_slides),
  };
}

export async function getReelsProductCtaLabel(
  storeId?: string | null,
): Promise<ReelProductCtaLabel> {
  const settings = await getReelsShowcaseSettings(storeId);
  return settings.productCtaLabel;
}

export async function setReelsProductCtaLabel(
  label: unknown,
): Promise<{ ok: true; label: ReelProductCtaLabel } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = reelProductCtaLabelSchema.safeParse(label);
  if (!parsed.success) {
    return { ok: false, error: "Choose a valid product button label." };
  }

  const patched = await patchReelsStoreSetting({
    reels_product_cta_label: parsed.data,
  });
  if (!patched.ok) return patched;
  return { ok: true, label: parsed.data };
}

export async function setReelsShowcaseLimit(
  limit: unknown,
): Promise<{ ok: true; limit: number } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const next = clampReelShowcaseLimit(limit);
  const patched = await patchReelsStoreSetting({
    reels_showcase_limit: next,
  });
  if (!patched.ok) return patched;
  return { ok: true, limit: next };
}

export async function setReelsAutoplayMuted(
  enabled: unknown,
): Promise<{ ok: true; autoplayMuted: boolean } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const autoplayMuted = Boolean(enabled);
  const patched = await patchReelsStoreSetting({
    reels_autoplay_muted: autoplayMuted,
  });
  if (!patched.ok) return patched;
  return { ok: true, autoplayMuted };
}

export async function setReelsProductPageHeading(
  heading: unknown,
): Promise<{ ok: true; heading: string } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = reelProductPageHeadingSchema.safeParse(heading);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a valid heading.",
    };
  }

  const patched = await patchReelsStoreSetting({
    reels_product_page_heading: parsed.data,
  });
  if (!patched.ok) return patched;
  return { ok: true, heading: parsed.data };
}

export async function setReelsVisibleSlides(
  slides: unknown,
): Promise<{ ok: true; visibleSlides: number } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const next = clampReelVisibleSlides(slides);
  const patched = await patchReelsStoreSetting({
    reels_visible_slides: next,
  });
  if (!patched.ok) return patched;
  return { ok: true, visibleSlides: next };
}

export async function setAdminReelVideoMaxMb(
  mb: unknown,
): Promise<{ ok: true; mb: number } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const next = coerceAdminReelVideoMaxMb(mb);
  const patched = await patchReelsStoreSetting({
    admin_reel_video_max_mb: next,
  });
  if (!patched.ok) return patched;
  return { ok: true, mb: next };
}

export async function reorderAdminReels(
  orderedIds: string[],
): Promise<{ ok: true; reels: StoreReel[] } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "Nothing to reorder." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("store_reels")
    .select("id")
    .eq("store_id", storeId);
  const allowed = new Set((existing ?? []).map((r) => r.id));
  const ids = orderedIds.filter((id) => allowed.has(id));
  if (ids.length === 0) return { ok: false, error: "No matching reels." };

  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("store_reels")
      .update({ sort_order: i })
      .eq("id", ids[i]!)
      .eq("store_id", storeId);
    if (error) {
      return unexpectedFailure({
        type: "CMS",
        source: "DATABASE",
        operation: "REORDER_REELS",
        feature: "CMS",
        message: error.message || "Unable to reorder reels",
        error,
        storeId,
        entityType: "store_reel",
        route: "/content/reels",
      });
    }
  }

  await revalidateReels(storeId);
  const reels = await listAdminReels();
  return { ok: true, reels };
}

async function patchReelsStoreSetting(
  patch: Partial<{
    reels_product_cta_label: string;
    reels_showcase_limit: number;
    reels_autoplay_muted: boolean;
    reels_product_page_heading: string;
    reels_visible_slides: number;
    admin_reel_video_max_mb: number;
  }>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("store_settings")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("store_settings")
      .update(patch)
      .eq("store_id", storeId);
    if (error) return { ok: false, error: "Unable to save reel settings." };
  } else {
    const { error } = await supabase.from("store_settings").insert({
      store_id: storeId,
      ...patch,
    });
    if (error) return { ok: false, error: "Unable to save reel settings." };
  }

  await revalidateReels(storeId);
  return { ok: true };
}

export function toReelFormValues(reel: StoreReel): ReelFormValues {
  return {
    title: reel.title,
    instagramUrl: reel.instagramUrl,
    videoPath: reel.videoPath ?? "",
    productIds: reel.productIds,
  };
}

async function hydrateStorefrontReels(
  rows: ReelRow[],
  productMap: Map<string, string[]>,
  productCtaLabel: string,
): Promise<StorefrontReel[]> {
  const allProductIds = [...new Set([...productMap.values()].flat())];
  const products =
    allProductIds.length > 0
      ? await listStorefrontProductsByIds(allProductIds)
      : [];
  const byId = new Map(products.map((p) => [p.id, p]));

  const result: StorefrontReel[] = [];
  for (const row of rows) {
    const videoUrl = resolveMediaUrl(row.video_path);
    if (!videoUrl) continue;
    const ids = productMap.get(row.id) ?? [];
    result.push({
      id: row.id,
      title: row.title,
      instagramUrl: row.instagram_url,
      videoUrl,
      productCtaLabel,
      sortOrder: row.sort_order,
      products: ids
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          minPrice: p.minPrice,
          imageUrl: p.primaryImageUrl,
        })),
    });
  }
  return result;
}

export async function listStorefrontHomeReels(
  storeId?: string | null,
  limit?: number,
): Promise<StorefrontReel[]> {
  const resolvedStoreId = storeId ?? (await resolveActiveStoreId());
  if (!resolvedStoreId) return [];
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];

  const settings = await getReelsShowcaseSettings(resolvedStoreId);
  const take = clampReelShowcaseLimit(
    limit ?? settings.showcaseLimit,
  );

  const { data } = await supabase
    .from("store_reels")
    .select("*")
    .eq("store_id", resolvedStoreId)
    .eq("is_active", true)
    .eq("show_on_home", true)
    .not("video_path", "is", null)
    .order("sort_order", { ascending: true })
    .limit(take);

  const rows = ((data ?? []) as ReelRow[]).filter(
    (r) => Boolean(r.video_path?.trim()),
  );
  if (!rows.length) return [];

  const { data: links } = await supabase
    .from("store_reel_products")
    .select("reel_id, product_id, sort_order")
    .in(
      "reel_id",
      rows.map((r) => r.id),
    )
    .order("sort_order", { ascending: true });

  const productMap = new Map<string, string[]>();
  for (const row of (links ?? []) as ReelProductRow[]) {
    const list = productMap.get(row.reel_id) ?? [];
    list.push(row.product_id);
    productMap.set(row.reel_id, list);
  }

  return hydrateStorefrontReels(rows, productMap, settings.productCtaLabel);
}

export async function listStorefrontReelsForProduct(
  productId: string,
  storeId?: string | null,
  limit = 8,
): Promise<StorefrontReel[]> {
  const resolvedStoreId = storeId ?? (await resolveActiveStoreId());
  if (!resolvedStoreId || !productId) return [];
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];

  const take = Math.min(16, Math.max(1, limit));

  // Inner-join keeps product↔reel links and active reels in one round-trip.
  // Filter `show_on_product_page` in JS so missing-column / older DBs still work.
  const { data, error } = await supabase
    .from("store_reels")
    .select("*, store_reel_products!inner(product_id, sort_order)")
    .eq("store_id", resolvedStoreId)
    .eq("is_active", true)
    .eq("store_reel_products.product_id", productId)
    .not("video_path", "is", null)
    .order("sort_order", { ascending: true })
    .limit(take);

  let rows: ReelRow[] = [];

  if (!error && data?.length) {
    rows = (data as Array<ReelRow & { show_on_product_page?: boolean | null }>)
      .filter(
        (r) =>
          Boolean(r.video_path?.trim()) && r.show_on_product_page !== false,
      )
      .map((r) => r as ReelRow);
  } else {
    // Fallback for schemas without show_on_product_page or without embed support.
    const { data: links } = await supabase
      .from("store_reel_products")
      .select("reel_id, sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });

    const reelIds = [...new Set((links ?? []).map((l) => l.reel_id))];
    if (!reelIds.length) return [];

    const { data: fallback } = await supabase
      .from("store_reels")
      .select("*")
      .eq("store_id", resolvedStoreId)
      .eq("is_active", true)
      .not("video_path", "is", null)
      .in("id", reelIds)
      .order("sort_order", { ascending: true })
      .limit(take);

    rows = ((fallback ?? []) as Array<
      ReelRow & { show_on_product_page?: boolean | null }
    >)
      .filter(
        (r) =>
          Boolean(r.video_path?.trim()) && r.show_on_product_page !== false,
      )
      .map((r) => r as ReelRow);
  }

  if (!rows.length) return [];

  const settings = await getReelsShowcaseSettings(resolvedStoreId);

  const { data: allLinks } = await supabase
    .from("store_reel_products")
    .select("reel_id, product_id, sort_order")
    .in(
      "reel_id",
      rows.map((r) => r.id),
    )
    .order("sort_order", { ascending: true });

  const productMap = new Map<string, string[]>();
  for (const row of (allLinks ?? []) as ReelProductRow[]) {
    const list = productMap.get(row.reel_id) ?? [];
    list.push(row.product_id);
    productMap.set(row.reel_id, list);
  }

  return hydrateStorefrontReels(rows, productMap, settings.productCtaLabel);
}

// Keep type export for callers that patch from the grid
export type { ReelGridPatch };
