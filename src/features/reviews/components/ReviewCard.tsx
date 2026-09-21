"use client";

import { cn } from "@/lib/cn";
import { StarRating } from "@/features/reviews/components/StarRating";
import type { ProductReview } from "@/features/reviews/types";
import { formatDate } from "@/lib/format-date";

type ReviewCardProps = {
  review: ProductReview;
  className?: string;
};

function initials(name: string | null): string {
  if (!name?.trim()) return "C";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "C";
}

/** Card-style review used on the dedicated reviews page grid. */
export function ReviewCard({ review, className }: ReviewCardProps) {
  const name = review.authorName ?? "Customer";

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[0_8px_24px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <StarRating value={review.rating} size="sm" />
        <time
          dateTime={review.createdAt}
          className="shrink-0 text-[0.7rem] tabular-nums text-[var(--color-muted)]"
        >
          {formatDate(review.createdAt)}
        </time>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-accent)_18%,var(--color-surface))] text-[0.7rem] font-semibold text-[color-mix(in_srgb,var(--color-accent)_70%,var(--color-foreground))]"
          aria-hidden
        >
          {initials(review.authorName)}
        </span>
        <p className="min-w-0 truncate text-sm font-medium text-[var(--color-foreground)]">
          {name}
        </p>
      </div>

      {review.body?.trim() ? (
        <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
          {review.body}
        </p>
      ) : (
        <p className="mt-3 text-sm italic text-[var(--color-muted)]">
          Rated without a written review
        </p>
      )}
    </article>
  );
}
