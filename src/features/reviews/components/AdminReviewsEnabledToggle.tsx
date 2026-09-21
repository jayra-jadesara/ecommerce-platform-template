"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  updateReviewsAutoApproveAction,
  updateReviewsEnabledAction,
} from "@/features/reviews/actions";

export function AdminReviewsSettingsToggles({
  enabled,
  autoApprove,
  canUpdate,
}: {
  enabled: boolean;
  autoApprove: boolean;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReviews, setShowReviews] = useState(enabled);
  const [auto, setAuto] = useState(autoApprove);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid max-w-3xl gap-2 sm:grid-cols-2">
      <div className="space-y-1.5">
        <AdminToggle
          variant="row"
          checked={showReviews}
          disabled={!canUpdate || pending}
          label="Show customer reviews"
          description="When on, ratings and reviews appear on product pages."
          onChange={(next) => {
            const previous = showReviews;
            setShowReviews(next);
            setError(null);
            startTransition(async () => {
              const result = await updateReviewsEnabledAction(next);
              if (!result.ok) {
                setShowReviews(previous);
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}
        />
      </div>
      <div className="space-y-1.5">
        <AdminToggle
          variant="row"
          checked={auto}
          disabled={!canUpdate || pending || !showReviews}
          label="Auto-approve reviews"
          description="When on, new reviews go live immediately without moderation."
          onChange={(next) => {
            const previous = auto;
            setAuto(next);
            setError(null);
            startTransition(async () => {
              const result = await updateReviewsAutoApproveAction(next);
              if (!result.ok) {
                setAuto(previous);
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}
        />
      </div>
      {error ? (
        <p className="text-xs text-red-700 sm:col-span-2" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
