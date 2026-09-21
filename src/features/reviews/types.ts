import type { ProductReviewStatus } from "@/types/database";

export type ReviewStatus = ProductReviewStatus;

export type ProductReview = {
  id: string;
  storeId: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  /** Display name from profile when available. */
  authorName: string | null;
};

export type AdminProductReview = ProductReview & {
  productName: string;
  productSlug: string;
};

export type ReviewSort = "newest" | "highest" | "lowest";

export type RatingDistribution = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type ProductReviewSummary = {
  productId: string;
  average: number;
  count: number;
  distribution: RatingDistribution;
};
