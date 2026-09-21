"use client";

import Image from "next/image";
import { StorefrontDialog } from "@/components/ui/StorefrontDialog";
import { ReviewForm } from "@/features/reviews/components/ReviewForm";

type WriteReviewDialogProps = {
  open: boolean;
  onClose: () => void;
  productId: string;
  productSlug: string;
  productName?: string;
  productImageUrl?: string | null;
};

export function WriteReviewDialog({
  open,
  onClose,
  productId,
  productSlug,
  productName,
  productImageUrl,
}: WriteReviewDialogProps) {
  return (
    <StorefrontDialog
      open={open}
      onClose={onClose}
      showClose
      title="Write a review"
      description="Rate with stars — a written review is optional."
      maxWidth="sm"
    >
      {productName ? (
        <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-default,0.65rem)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background)_70%,var(--color-card))] p-2.5">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-default,0.45rem)] bg-[color-mix(in_srgb,var(--color-primary)_4%,var(--color-background))]">
            {productImageUrl ? (
              <Image
                src={productImageUrl}
                alt=""
                fill
                className="object-contain p-1"
                sizes="56px"
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-[0.65rem] text-[var(--color-muted)]"
                aria-hidden
              >
                No image
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Reviewing
            </p>
            <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
              {productName}
            </p>
          </div>
        </div>
      ) : null}
      <ReviewForm
        productId={productId}
        productSlug={productSlug}
        onSuccess={onClose}
      />
    </StorefrontDialog>
  );
}
