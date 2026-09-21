"use client";

import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import {
  updateReviewsAutoApproveAction,
  updateReviewsEnabledAction,
  updateReviewsPreviewLimitAction,
} from "@/features/reviews/actions";
import { cn } from "@/lib/cn";

const PREVIEW_LIMIT_OPTIONS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
] as const;

export function AdminReviewsSettingsToggles({
  enabled,
  autoApprove,
  previewLimit,
  canUpdate,
}: {
  enabled: boolean;
  autoApprove: boolean;
  previewLimit: number;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showReviews, setShowReviews] = useState(enabled);
  const [auto, setAuto] = useState(autoApprove);
  const [limit, setLimit] = useState(String(previewLimit));
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        className={cn(adminBtn("secondary"), "gap-1.5")}
        onClick={() => {
          setShowReviews(enabled);
          setAuto(autoApprove);
          setLimit(String(previewLimit));
          setError(null);
          setOpen(true);
        }}
      >
        <SettingsOutlinedIcon sx={{ fontSize: 18 }} aria-hidden />
        Review display
      </button>

      <Dialog
        open={open}
        onClose={pending ? undefined : () => setOpen(false)}
        fullWidth
        maxWidth="xs"
        aria-labelledby={titleId}
        slotProps={{
          paper: {
            sx: {
              margin: 2,
              borderRadius: "14px",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-card)",
              backgroundImage: "none",
            },
          },
        }}
      >
        <DialogTitle
          id={titleId}
          className="!pb-1 !pt-4 !text-lg font-semibold text-[var(--color-foreground)]"
        >
          Review display
        </DialogTitle>
        <DialogContent className="!pt-2">
          <p className="mb-3 text-sm leading-snug text-[var(--color-muted)]">
            Choose how reviews appear on your store — visibility, auto-approve,
            and how many show on each product page.
          </p>

          <div className="space-y-2.5">
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
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <AdminSelect
                label="Product page preview"
                value={limit}
                disabled={!canUpdate || pending || !showReviews}
                fullWidth
                options={PREVIEW_LIMIT_OPTIONS}
                helperText="How many reviews show on the product page (1–6)."
                onChange={(next) => {
                  const previous = limit;
                  setLimit(next);
                  setError(null);
                  startTransition(async () => {
                    const result = await updateReviewsPreviewLimitAction(
                      Number(next),
                    );
                    if (!result.ok) {
                      setLimit(previous);
                      setError(result.error);
                      return;
                    }
                    router.refresh();
                  });
                }}
              />
            </div>
          </div>

          {error ? (
            <p className="mt-2 text-xs text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className={adminBtn("primary")}
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
