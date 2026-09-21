"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requirePermission } from "@/features/auth/session";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";
import {
  CATALOG_CACHE_TAG,
  CATALOG_PRODUCTS_TAG,
  productCacheTag,
} from "@/features/catalog/cache";
import {
  listAdminProductReviews,
  setReviewsAutoApprove,
  setReviewsEnabled,
  submitProductReview,
  updateAdminProductReviewStatus,
} from "@/features/reviews/service";
import type { ProductReviewStatus } from "@/types/database";
import { STOREFRONT_CONFIG_CACHE_TAG } from "@/features/theme/service";

function revalidateReviewsStorefront() {
  revalidatePath("/catalog/reviews");
  revalidatePath("/products");
  revalidateTag(CATALOG_CACHE_TAG, "max");
  revalidateTag(CATALOG_PRODUCTS_TAG, "max");
  revalidateTag(STOREFRONT_CONFIG_CACHE_TAG, "max");
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
      if (result.ok) {
        revalidatePath("/products");
        revalidateTag(CATALOG_CACHE_TAG, "max");
        revalidateTag(CATALOG_PRODUCTS_TAG, "max");
        if (productSlug) {
          revalidateTag(productCacheTag(productSlug), "max");
          revalidatePath(`/products/${productSlug}`);
        }
      }
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
      if (result.ok) revalidateReviewsStorefront();
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
      if (result.ok) revalidateReviewsStorefront();
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
      if (result.ok) {
        revalidatePath("/catalog/reviews");
        revalidatePath("/products");
        revalidateTag(CATALOG_CACHE_TAG, "max");
        revalidateTag(CATALOG_PRODUCTS_TAG, "max");
        if (productSlug) {
          revalidateTag(productCacheTag(productSlug), "max");
          revalidatePath(`/products/${productSlug}`);
        }
      }
      return result;
    },
  );
}
