"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ReviewCard } from "@/features/reviews/components/ReviewCard";
import { RatingDistributionBars } from "@/features/reviews/components/RatingDistribution";
import { StarRating } from "@/features/reviews/components/StarRating";
import { WriteReviewDialog } from "@/features/reviews/components/WriteReviewDialog";
import type {
  ProductReview,
  ProductReviewSummary,
  ReviewSort,
} from "@/features/reviews/types";
import { StorefrontSelect } from "@/components/ui/StorefrontSelect";
import { sfBtn, sfDisplay } from "@/components/ui/storefront-classes";

const SORT_OPTIONS: Array<{ value: ReviewSort; label: string }> = [
  { value: "newest", label: "Most Recent" },
  { value: "highest", label: "Highest rating" },
  { value: "lowest", label: "Lowest rating" },
];

type ProductReviewsPageClientProps = {
  productId: string;
  productSlug: string;
  productName: string;
  productImageUrl?: string | null;
  isAuthenticated: boolean;
  summary: ProductReviewSummary;
  reviews: ProductReview[];
  myReview: ProductReview | null;
};

function sortReviews(
  reviews: ProductReview[],
  sort: ReviewSort,
): ProductReview[] {
  const copy = [...reviews];
  if (sort === "highest") {
    copy.sort(
      (a, b) =>
        b.rating - a.rating || b.createdAt.localeCompare(a.createdAt),
    );
  } else if (sort === "lowest") {
    copy.sort(
      (a, b) =>
        a.rating - b.rating || b.createdAt.localeCompare(a.createdAt),
    );
  } else {
    copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return copy;
}

export function ProductReviewsPageClient({
  productId,
  productSlug,
  productName,
  productImageUrl,
  isAuthenticated,
  summary,
  reviews,
  myReview,
}: ProductReviewsPageClientProps) {
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [writeOpen, setWriteOpen] = useState(false);
  const sorted = useMemo(() => sortReviews(reviews, sort), [reviews, sort]);
  const avgDisplay = summary.count > 0 ? summary.average.toFixed(1) : "0";
  const canWrite = isAuthenticated && !myReview;
  const loginHref = `/login?next=${encodeURIComponent(`/products/${productSlug}/reviews`)}`;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Customer reviews
          </p>
          <h1
            className={`${sfDisplay()} text-2xl tracking-tight text-[var(--color-foreground)] md:text-[1.75rem]`}
          >
            {productName}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            {summary.count === 0
              ? "No reviews yet"
              : `${summary.count} review${summary.count === 1 ? "" : "s"} · ${avgDisplay} average`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite ? (
            <button
              type="button"
              className={sfBtn("primary")}
              onClick={() => setWriteOpen(true)}
            >
              Write a review
            </button>
          ) : !isAuthenticated ? (
            <Link href={loginHref} className={sfBtn("primary")}>
              Login to review
            </Link>
          ) : null}
          <Link
            href={`/products/${productSlug}`}
            className={sfBtn("outline")}
          >
            Back to product
          </Link>
        </div>
      </header>

      <div className="grid gap-6 rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8 sm:p-5">
        <div className="flex items-center gap-3">
          <p className="text-4xl font-bold tabular-nums tracking-tight text-[var(--color-foreground)]">
            {avgDisplay}
          </p>
          <div>
            <StarRating
              value={summary.count > 0 ? summary.average : 0}
              size="md"
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Average rating
            </p>
          </div>
        </div>
        <RatingDistributionBars
          distribution={summary.distribution}
          total={summary.count}
          className="max-w-sm sm:justify-self-end"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-[15rem] items-center gap-2">
          <span className="shrink-0 text-xs text-[var(--color-muted)]">
            Sort by :
          </span>
          <div className="min-w-0 flex-1">
            <StorefrontSelect
              aria-label="Sort reviews"
              value={sort}
              onChange={(value) => setSort(value as ReviewSort)}
              options={SORT_OPTIONS}
            />
          </div>
        </div>
        {myReview?.status === "pending" ? (
          <p className="text-xs text-[var(--color-muted)]" role="status">
            Your review is awaiting approval.
          </p>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--color-muted)]">
          No reviews yet. Be the first to share your experience.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((review) => (
            <li key={review.id} className="min-w-0">
              <ReviewCard review={review} />
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <WriteReviewDialog
          open={writeOpen}
          onClose={() => setWriteOpen(false)}
          productId={productId}
          productSlug={productSlug}
          productName={productName}
          productImageUrl={productImageUrl}
        />
      ) : null}
    </div>
  );
}
