"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
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
import { formatDate } from "@/lib/format-date";

const SORT_OPTIONS: Array<{ value: ReviewSort; label: string }> = [
  { value: "newest", label: "Most Recent" },
  { value: "highest", label: "Highest rating" },
  { value: "lowest", label: "Lowest rating" },
];

type ProductReviewsSectionProps = {
  productId: string;
  productSlug: string;
  productName?: string;
  productImageUrl?: string | null;
  isAuthenticated: boolean;
  summary: ProductReviewSummary;
  reviews: ProductReview[];
  myReview: ProductReview | null;
  /** How many reviews to show on the product page (1–6). */
  previewLimit?: number;
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

function SummaryIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-accent)_28%,var(--color-surface))] text-[color-mix(in_srgb,var(--color-accent)_75%,var(--color-foreground))]"
      aria-hidden
    >
      {children}
    </span>
  );
}

export function ProductReviewsSection({
  productId,
  productSlug,
  productName,
  productImageUrl,
  isAuthenticated,
  summary,
  reviews,
  myReview,
  previewLimit = 3,
}: ProductReviewsSectionProps) {
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [writeOpen, setWriteOpen] = useState(false);
  const limit = Math.min(6, Math.max(1, Math.round(previewLimit) || 3));
  const sorted = useMemo(() => sortReviews(reviews, sort), [reviews, sort]);
  const preview = sorted.slice(0, limit);
  const hasMore = summary.count > limit;
  const reviewsHref = `/products/${productSlug}/reviews`;
  const loginHref = `/login?next=${encodeURIComponent(reviewsHref)}`;
  const avgDisplay = summary.count > 0 ? summary.average.toFixed(1) : "0";
  const canWrite = isAuthenticated && !myReview;

  return (
    <section
      className="mt-10 border-t border-[var(--color-border)] pt-8 md:mt-12 md:pt-10"
      aria-labelledby="product-reviews-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="product-reviews-heading"
          className={`${sfDisplay()} text-xl leading-none tracking-tight text-[var(--color-foreground)] md:text-[1.35rem]`}
        >
          Reviews
        </h2>
        {canWrite ? (
          <button
            type="button"
            className={sfBtn("outline")}
            onClick={() => setWriteOpen(true)}
          >
            Write a review
          </button>
        ) : !isAuthenticated ? (
          <Link href={loginHref} className={sfBtn("outline")}>
            Login to review
          </Link>
        ) : null}
      </div>

      <div className="mt-5 mx-auto grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.1fr)] sm:gap-0 sm:divide-x sm:divide-[var(--color-border)]">
        <div className="flex items-start gap-2.5 sm:pr-4">
          <SummaryIcon>
            <PersonOutlineOutlinedIcon sx={{ fontSize: 20 }} />
          </SummaryIcon>
          <div className="min-w-0 pt-0.5">
            <p className="text-xs font-semibold text-[var(--color-foreground)]">
              Total Reviews
            </p>
            <p className="mt-1 text-xl font-bold leading-none tabular-nums tracking-tight text-[var(--color-foreground)]">
              {summary.count}
            </p>
            <p className="mt-1 text-[0.65rem] leading-snug text-[var(--color-muted)]">
              On this product
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 sm:px-4">
          <SummaryIcon>
            <StarBorderRoundedIcon sx={{ fontSize: 22 }} />
          </SummaryIcon>
          <div className="min-w-0 pt-0.5">
            <p className="text-xs font-semibold text-[var(--color-foreground)]">
              Average Rating
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <p className="text-xl font-bold leading-none tabular-nums tracking-tight text-[var(--color-foreground)]">
                {avgDisplay}
              </p>
              <StarRating
                value={summary.count > 0 ? summary.average : 0}
                size="md"
                aria-label={
                  summary.count > 0
                    ? `Average rating ${avgDisplay} of 5`
                    : "No ratings yet"
                }
              />
            </div>
            <p className="mt-1 text-[0.65rem] leading-snug text-[var(--color-muted)]">
              Across all ratings
            </p>
          </div>
        </div>

        <div className="flex items-center sm:pl-4">
          <RatingDistributionBars
            distribution={summary.distribution}
            total={summary.count}
            className="w-full"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
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
          <p className="text-xs text-[var(--color-muted)] sm:text-sm" role="status">
            Your review is awaiting approval.
          </p>
        ) : null}
      </div>

      <div className="mt-1">
        {preview.length === 0 ? (
          <p className="py-6 text-sm text-[var(--color-muted)]">
            No reviews yet.
          </p>
        ) : (
          <ul>
            {preview.map((review) => (
              <li
                key={review.id}
                className="border-t border-[var(--color-border)] py-4 first:border-t-0"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StarRating value={review.rating} size="md" />
                  <span className="text-sm font-medium text-[var(--color-foreground)]">
                    {review.authorName ?? "Customer"}
                  </span>
                  <span className="text-[var(--color-muted)]/40" aria-hidden>
                    ·
                  </span>
                  <time
                    dateTime={review.createdAt}
                    className="text-xs text-[var(--color-muted)]"
                  >
                    {formatDate(review.createdAt)}
                  </time>
                </div>
                {review.body?.trim() ? (
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
                    {review.body}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasMore || summary.count > 0 ? (
        <div className="mt-4 flex justify-center border-t border-[var(--color-border)] pt-5">
          <Link href={reviewsHref} className={sfBtn("outline")}>
            {hasMore
              ? `See all ${summary.count} reviews`
              : "View reviews page"}
          </Link>
        </div>
      ) : null}

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
    </section>
  );
}
