"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitProductReviewAction } from "@/features/reviews/actions";
import { StarRating } from "@/features/reviews/components/StarRating";
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

type ReviewFormProps = {
  productId: string;
  productSlug: string;
  className?: string;
  /** Called after a successful submit (e.g. close a dialog). */
  onSuccess?: () => void;
};

export function ReviewForm({
  productId,
  productSlug,
  className,
  onSuccess,
}: ReviewFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function validateLocal(): boolean {
    const next: Record<string, string> = {};
    if (rating < 1 || rating > 5) {
      next.rating = "Choose a rating from 1 to 5.";
    }
    if (body.trim().length > 4000) {
      next.body = "Review must be 4000 characters or fewer.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  return (
    <form
      className={cn("space-y-4", className)}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        if (!validateLocal()) return;

        startTransition(async () => {
          const result = await submitProductReviewAction(
            {
              productId,
              rating,
              body: body.trim(),
            },
            productSlug,
          );
          if (!result.ok) {
            setError(result.error);
            if ("fieldErrors" in result && result.fieldErrors) {
              setFieldErrors(result.fieldErrors);
            }
            return;
          }
          setSuccess(result.message);
          setRating(0);
          setBody("");
          setFieldErrors({});
          router.refresh();
          onSuccess?.();
        });
      }}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-foreground)]">
          Your rating <span className="text-[var(--color-error)]">*</span>
        </p>
        <StarRating
          value={rating}
          interactive
          size="lg"
          onChange={(value) => {
            setRating(value);
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next.rating;
              return next;
            });
          }}
          disabled={pending}
          aria-label="Your rating"
        />
        {fieldErrors.rating ? (
          <p className="text-xs text-[var(--color-error)]" role="alert">
            {fieldErrors.rating}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="review-body"
          className="text-sm font-medium text-[var(--color-foreground)]"
        >
          Your review{" "}
          <span className="font-normal text-[var(--color-muted)]">
            (optional)
          </span>
        </label>
        <textarea
          id="review-body"
          rows={3}
          maxLength={4000}
          value={body}
          disabled={pending}
          placeholder="Share what you liked… (optional)"
          onChange={(e) => {
            setBody(e.target.value);
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next.body;
              return next;
            });
          }}
          className={cn(
            "w-full resize-y border-0 border-b border-[var(--color-border)] bg-transparent px-0 py-2 text-sm leading-relaxed text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)]",
            fieldErrors.body && "border-[var(--color-error)]",
          )}
        />
        {fieldErrors.body ? (
          <p className="text-xs text-[var(--color-error)]" role="alert">
            {fieldErrors.body}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-[var(--color-primary)]" role="status">
          {success}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={sfBtn("primary")}>
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
