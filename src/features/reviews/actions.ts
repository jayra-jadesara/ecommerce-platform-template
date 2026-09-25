"use server";

import { revalidatePath } from "next/cache";
import { getAdminPath } from "@/config/admin-route";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { requirePermission } from "@/features/auth/session";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";
import { productCacheTag } from "@/features/catalog/cache";
import {
  listAdminProductReviews,
  setReviewsAutoApprove,
  setReviewsEnabled,
  setReviewsPreviewLimit,
  submitProductReview,
  updateAdminProductReviewStatus,
} from "@/features/reviews/service";
import type { ProductReviewStatus } from "@/types/database";
import { publishStorefrontSync } from "@/features/sync/server";

const ADMIN_REVIEWS_ROUTE = getAdminPath("/catalog/reviews");

async function revalidateReviewsStorefront(productSlug?: string | null) {
  revalidatePath(ADMIN_REVIEWS_ROUTE);
  const storeId = await resolveActiveStoreId();
  if (!storeId) return;
  await publishStorefrontSync({
    storeId,
    topics: ["catalog.reviews"],
    extraTags: productSlug ? [productCacheTag(productSlug)] : undefined,
    extraPaths: productSlug ? [`/products/${productSlug}`] : undefined,
  });
}

export async function submitProductReviewAction(
  raw: unknown,
  productSlug?: string | null,
) {
  const { enforceRateLimit, rateLimitErrorMessage } = await import(
    "@/lib/security/server-rate-limit"
  );
  const limited = await enforceRateLimit("reviews");
  if (!limited.allowed) {
    return {
      ok: false as const,
      error: rateLimitErrorMessage(limited.retryAfterMs),
    };
  }

  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "SUBMIT_PRODUCT_REVIEW",
      feature: "REVIEWS",
      entityType: "product_review",
      route: "/products",
    },
    async () => {
      const result = await submitProductReview(raw);
      if (result.ok) await revalidateReviewsStorefront(productSlug);
      return result;
    },
  );
}

export async function updateReviewsEnabledAction(enabled: boolean) {
  await requirePermission("reviews.moderate");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_REVIEWS_ENABLED",
      feature: "REVIEWS",
      entityType: "store_settings",
      route: "/catalog/reviews",
    },
    async () => {
      const result = await setReviewsEnabled(Boolean(enabled));
      if (result.ok) await revalidateReviewsStorefront();
      return result;
    },
  );
}

export async function updateReviewsAutoApproveAction(autoApprove: boolean) {
  await requirePermission("reviews.moderate");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_REVIEWS_AUTO_APPROVE",
      feature: "REVIEWS",
      entityType: "store_settings",
      route: "/catalog/reviews",
    },
    async () => {
      const result = await setReviewsAutoApprove(Boolean(autoApprove));
      if (result.ok) await revalidateReviewsStorefront();
      return result;
    },
  );
}

export async function updateReviewsPreviewLimitAction(previewLimit: number) {
  await requirePermission("reviews.moderate");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_REVIEWS_PREVIEW_LIMIT",
      feature: "REVIEWS",
      entityType: "store_settings",
      route: "/catalog/reviews",
    },
    async () => {
      const result = await setReviewsPreviewLimit(Number(previewLimit));
      if (result.ok) await revalidateReviewsStorefront();
      return result;
    },
  );
}

export async function listAdminProductReviewsAction(input?: {
  status?: ProductReviewStatus | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  await requirePermission("reviews.view");
  return listAdminProductReviews(input);
}

export async function updateProductReviewStatusAction(
  id: string,
  status: unknown,
  productSlug?: string | null,
) {
  await requirePermission("reviews.moderate");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_PRODUCT_REVIEW_STATUS",
      feature: "REVIEWS",
      entityType: "product_review",
      entityId: id,
      route: "/catalog/reviews",
    },
    async () => {
      const result = await updateAdminProductReviewStatus(id, status);
      if (result.ok) await revalidateReviewsStorefront(productSlug);
      return result;
    },
  );
}
