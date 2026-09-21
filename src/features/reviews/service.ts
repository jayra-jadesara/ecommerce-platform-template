import "server-only";

import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import {
  productReviewStatusSchema,
  reviewSortSchema,
  submitProductReviewSchema,
} from "@/features/reviews/schemas";
import type {
  AdminProductReview,
  ProductReview,
  ProductReviewSummary,
  RatingDistribution,
  ReviewSort,
} from "@/features/reviews/types";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodValidationFailure, type FieldErrors } from "@/lib/validation";
import type { ProductReviewStatus, Tables } from "@/types/database";

function emptyDistribution(): RatingDistribution {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function authorDisplayName(
  profile:
    | { first_name: string | null; last_name: string | null }
    | null
    | undefined,
): string | null {
  if (!profile) return null;
  const name = [profile.first_name, profile.last_name]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" ");
  return name || null;
}

function mapReview(row: Tables<"product_reviews">): ProductReview {
  return {
    id: row.id,
    storeId: row.store_id,
    productId: row.product_id,
    userId: row.user_id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: row.author_name,
  };
}

async function resolveStoreId(): Promise<string | null> {
  return resolveActiveStoreId();
}

/** Storefront flag — default on when unset. */
export async function getReviewsEnabled(): Promise<boolean> {
  const settings = await getReviewsStoreSettings();
  return settings.enabled;
}

/** When true, new reviews publish immediately. Default off. */
export async function getReviewsAutoApprove(): Promise<boolean> {
  const settings = await getReviewsStoreSettings();
  return settings.autoApprove;
}

export type ReviewsStoreSettings = {
  enabled: boolean;
  autoApprove: boolean;
  /** Product-page preview count (1–6). Default 3. */
  previewLimit: number;
};

const DEFAULT_PREVIEW_LIMIT = 3;

function clampPreviewLimit(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PREVIEW_LIMIT;
  return Math.min(6, Math.max(1, Math.round(n)));
}

export async function getReviewsStoreSettings(): Promise<ReviewsStoreSettings> {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return {
      enabled: true,
      autoApprove: false,
      previewLimit: DEFAULT_PREVIEW_LIMIT,
    };
  }

  const supabase = createSupabasePublicClient();
  if (!supabase) {
    return {
      enabled: true,
      autoApprove: false,
      previewLimit: DEFAULT_PREVIEW_LIMIT,
    };
  }

  const { data } = await supabase
    .from("store_settings")
    .select("reviews_enabled, reviews_auto_approve, reviews_preview_limit")
    .eq("store_id", storeId)
    .maybeSingle();

  return {
    enabled:
      typeof data?.reviews_enabled === "boolean" ? data.reviews_enabled : true,
    autoApprove:
      typeof data?.reviews_auto_approve === "boolean"
        ? data.reviews_auto_approve
        : false,
    previewLimit: clampPreviewLimit(data?.reviews_preview_limit),
  };
}

export async function setReviewsEnabled(
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return patchReviewsStoreSetting({ reviews_enabled: enabled });
}

export async function setReviewsAutoApprove(
  autoApprove: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return patchReviewsStoreSetting({ reviews_auto_approve: autoApprove });
}

export async function setReviewsPreviewLimit(
  previewLimit: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const limit = clampPreviewLimit(previewLimit);
  return patchReviewsStoreSetting({ reviews_preview_limit: limit });
}

async function patchReviewsStoreSetting(
  patch: Partial<{
    reviews_enabled: boolean;
    reviews_auto_approve: boolean;
    reviews_preview_limit: number;
  }>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const storeId = await resolveStoreId();
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
    if (error) return { ok: false, error: "Unable to update reviews setting." };
  } else {
    const { error } = await supabase.from("store_settings").insert({
      store_id: storeId,
      ...patch,
    });
    if (error) return { ok: false, error: "Unable to save reviews setting." };
  }

  return { ok: true };
}

export async function getProductReviewSummary(
  productId: string,
): Promise<ProductReviewSummary> {
  const storeId = await resolveStoreId();
  const empty: ProductReviewSummary = {
    productId,
    average: 0,
    count: 0,
    distribution: emptyDistribution(),
  };
  if (!storeId) return empty;

  const supabase = createSupabasePublicClient();
  if (!supabase) return empty;

  const { data } = await supabase
    .from("product_reviews")
    .select("rating")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .eq("status", "approved");

  const rows = data ?? [];
  if (rows.length === 0) return empty;

  const distribution = emptyDistribution();
  let sum = 0;
  for (const row of rows) {
    const r = Number(row.rating);
    if (r >= 1 && r <= 5) {
      distribution[r as 1 | 2 | 3 | 4 | 5] += 1;
      sum += r;
    }
  }
  const count = rows.length;
  return {
    productId,
    average: Math.round((sum / count) * 100) / 100,
    count,
    distribution,
  };
}

export async function listApprovedProductReviews(
  productId: string,
  sort: ReviewSort = "newest",
  limit = 50,
): Promise<ProductReview[]> {
  const storeId = await resolveStoreId();
  if (!storeId) return [];

  const supabase = createSupabasePublicClient();
  if (!supabase) return [];

  const parsedSort = reviewSortSchema.safeParse(sort);
  const sortKey = parsedSort.success ? parsedSort.data : "newest";

  let query = supabase
    .from("product_reviews")
    .select("*")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .eq("status", "approved")
    .limit(Math.min(Math.max(limit, 1), 100));

  if (sortKey === "highest") {
    query = query
      .order("rating", { ascending: false })
      .order("created_at", { ascending: false });
  } else if (sortKey === "lowest") {
    query = query
      .order("rating", { ascending: true })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data } = await query;
  const rows = (data ?? []) as Tables<"product_reviews">[];
  return rows.map((row) => mapReview(row));
}

export async function getMyProductReview(
  productId: string,
): Promise<ProductReview | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const storeId = await resolveStoreId();
  if (!storeId) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .eq("user_id", user.id)
    .maybeSingle();

  return data ? mapReview(data as Tables<"product_reviews">) : null;
}

async function resolveAuthorName(userId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  return authorDisplayName(data) ?? "Customer";
}

export type SubmitReviewResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors; kind?: string };

export async function submitProductReview(
  raw: unknown,
): Promise<SubmitReviewResult> {
  const enabled = await getReviewsEnabled();
  if (!enabled) {
    return { ok: false, error: "Reviews are currently disabled." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to leave a review." };
  }

  const storeId = await resolveStoreId();
  if (!storeId) return { ok: false, error: "Store unavailable." };

  const parsed = submitProductReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Please check your review.");
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, status")
    .eq("id", values.productId)
    .eq("store_id", storeId)
    .eq("status", "active")
    .maybeSingle();

  if (!product) {
    return { ok: false, error: "Product not found." };
  }

  const { data: existing } = await supabase
    .from("product_reviews")
    .select("id")
    .eq("store_id", storeId)
    .eq("product_id", values.productId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "You already reviewed this product.",
    };
  }

  const authorName = await resolveAuthorName(user.id);
  const autoApprove = await getReviewsAutoApprove();

  const { error } = await supabase.from("product_reviews").insert({
    store_id: storeId,
    product_id: values.productId,
    user_id: user.id,
    rating: values.rating,
    title: values.title,
    body: values.body,
    author_name: authorName,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "You already reviewed this product." };
    }
    return { ok: false, error: "Unable to submit your review." };
  }

  return {
    ok: true,
    message: autoApprove
      ? "Thanks! Your review is now live on this product."
      : "Thanks! Your review was submitted and is awaiting approval.",
  };
}

export async function listAdminProductReviews(input?: {
  status?: ProductReviewStatus | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: AdminProductReview[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input?.pageSize ?? 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const storeId = await resolveStoreId();
  if (!storeId) return { items: [], total: 0, page, pageSize };

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("product_reviews")
    .select(
      `
      *,
      products ( id, name, slug )
    `,
      { count: "exact" },
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  const status = input?.status;
  if (status && status !== "all") {
    const parsed = productReviewStatusSchema.safeParse(status);
    if (parsed.success) {
      query = query.eq("status", parsed.data);
    }
  }

  const search = input?.search?.trim().replace(/[%_,]/g, "") ?? "";
  if (search) {
    query = query.or(
      `body.ilike.%${search}%,author_name.ilike.%${search}%,title.ilike.%${search}%`,
    );
  }

  const { data, count } = await query.range(from, to);
  const rows = (data ?? []) as Array<
    Tables<"product_reviews"> & {
      products:
        | { id: string; name: string; slug: string }
        | { id: string; name: string; slug: string }[]
        | null;
    }
  >;

  const items: AdminProductReview[] = rows.map((row) => {
    const product = Array.isArray(row.products)
      ? row.products[0]
      : row.products;
    return {
      ...mapReview(row),
      productName: product?.name ?? "Unknown product",
      productSlug: product?.slug ?? "",
    };
  });

  return {
    items,
    total: count ?? items.length,
    page,
    pageSize,
  };
}

export async function updateAdminProductReviewStatus(
  id: string,
  status: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const storeId = await resolveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = productReviewStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_reviews")
    .update({ status: parsed.data })
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) return { ok: false, error: "Unable to update review." };
  return { ok: true };
}
