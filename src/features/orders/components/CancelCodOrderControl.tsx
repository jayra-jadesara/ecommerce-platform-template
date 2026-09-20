"use client";

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { cancelOwnOrderAction } from "@/features/orders/actions";
import { canCustomerCancelCodOrder } from "@/features/orders/customer-cancel";
import type { OrderStatus } from "@/types/database";
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

export function CancelCodOrderControl({
  orderId,
  status,
  paymentProvider,
}: {
  orderId: string;
  status: OrderStatus;
  paymentProvider: string | null | undefined;
}) {
  const router = useRouter();
  const titleId = useId();
  const descId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canCustomerCancelCodOrder({ status, paymentProvider })) {
    return null;
  }

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  function confirmCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelOwnOrderAction({ orderId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push("/account/orders");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            Need to cancel?
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Cash on Delivery orders can be cancelled before they ship.
          </p>
        </div>
        <button
          type="button"
          className={cn(sfBtn("outline"), "shrink-0 !min-h-10 !px-4 !text-sm")}
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          Cancel order
        </button>
      </div>

      <Dialog
        open={open}
        onClose={close}
        maxWidth="sm"
        fullWidth
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <DialogTitle id={titleId}>Cancel this order?</DialogTitle>
        <DialogContent>
          <p id={descId} className="text-sm text-[var(--color-muted)]">
            This Cash on Delivery order will be cancelled and stock returned to
            the store. You can place a new order anytime.
          </p>
          {error ? (
            <p
              className="mt-3 rounded-md border border-[color-mix(in_srgb,var(--color-error)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_8%,var(--color-card))] px-3 py-2 text-sm text-[var(--color-error)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </DialogContent>
        <DialogActions className="gap-2 px-4 pb-4">
          <button
            type="button"
            className={cn(sfBtn("ghost"), "!min-h-10")}
            disabled={pending}
            onClick={close}
          >
            Keep order
          </button>
          <button
            type="button"
            className={cn(sfBtn("danger"), "!min-h-10")}
            disabled={pending}
            onClick={confirmCancel}
          >
            {pending ? "Cancelling…" : "Cancel order"}
          </button>
        </DialogActions>
      </Dialog>
    </>
  );
}
