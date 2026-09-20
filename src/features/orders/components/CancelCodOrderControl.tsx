"use client";

import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { StorefrontDialog } from "@/components/ui/StorefrontDialog";
import { cancelOwnOrderAction } from "@/features/orders/actions";
import { canCustomerCancelCodOrder } from "@/features/orders/customer-cancel";
import {
  coerceCancelReasonOptions,
  isOtherCancelReason,
} from "@/features/shipping/policies";
import type { OrderStatus } from "@/types/database";
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

export function CancelCodOrderControl({
  orderId,
  status,
  paymentProvider,
  reasonOptions: reasonOptionsProp,
}: {
  orderId: string;
  status: OrderStatus;
  paymentProvider: string | null | undefined;
  reasonOptions?: string[];
}) {
  const router = useRouter();
  const reasonLabelId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reasonOptions = useMemo(
    () => coerceCancelReasonOptions(reasonOptionsProp),
    [reasonOptionsProp],
  );
  const defaultReason = reasonOptions[0] ?? "Other";
  const [reasonCode, setReasonCode] = useState(defaultReason);
  const [otherText, setOtherText] = useState("");

  if (!canCustomerCancelCodOrder({ status, paymentProvider })) {
    return null;
  }

  const otherSelected = isOtherCancelReason(reasonCode);
  const canSubmit =
    Boolean(reasonCode) &&
    (!otherSelected || otherText.trim().length >= 3);

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  function openDialog() {
    setError(null);
    setReasonCode(defaultReason);
    setOtherText("");
    setOpen(true);
  }

  function confirmCancel() {
    setError(null);
    if (!canSubmit) {
      setError(
        otherSelected
          ? "Please write a short reason (at least 3 characters)."
          : "Please choose a cancel reason.",
      );
      return;
    }

    const reason = otherSelected ? otherText.trim() : reasonCode;

    startTransition(async () => {
      const result = await cancelOwnOrderAction({
        orderId,
        reasonCode,
        reason,
      });
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
          onClick={openDialog}
        >
          Cancel order
        </button>
      </div>

      <StorefrontDialog
        open={open}
        onClose={close}
        pending={pending}
        compact
        title="Why are you cancelling?"
        description="COD order will be cancelled and stock returned. You can order again anytime."
        actions={
          <>
            <button
              type="button"
              className={cn(sfBtn("ghost"), "!min-h-8 !px-3 !text-xs")}
              disabled={pending}
              onClick={close}
            >
              Keep order
            </button>
            <button
              type="button"
              className={cn(sfBtn("danger"), "!min-h-8 !px-3 !text-xs")}
              disabled={pending || !canSubmit}
              onClick={confirmCancel}
            >
              {pending ? "Cancelling…" : "Cancel order"}
            </button>
          </>
        }
      >
        <FormControl disabled={pending} className="!block w-full">
          <p
            id={reasonLabelId}
            className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]"
          >
            Select a reason
          </p>
          <RadioGroup
            aria-labelledby={reasonLabelId}
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value)}
            className="!gap-0"
          >
            {reasonOptions.map((option) => (
              <FormControlLabel
                key={option}
                value={option}
                control={
                  <Radio
                    size="small"
                    sx={{
                      padding: "4px",
                      color: "var(--color-muted)",
                      "&.Mui-checked": { color: "var(--color-primary)" },
                    }}
                  />
                }
                label={
                  <span className="text-[13px] leading-tight text-[var(--color-foreground)]">
                    {isOtherCancelReason(option)
                      ? "Other (write your own)"
                      : option}
                  </span>
                }
                className="!mx-0 !min-h-0 !rounded-md !py-0 !pl-0.5 hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
                sx={{
                  marginBottom: 0,
                  alignItems: "center",
                  "& .MuiFormControlLabel-label": { marginLeft: "2px" },
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>

        {otherSelected ? (
          <label className="mt-2 block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
              Tell us briefly
            </span>
            <textarea
              value={otherText}
              onChange={(event) => setOtherText(event.target.value)}
              disabled={pending}
              rows={2}
              maxLength={240}
              placeholder="Short reason…"
              className="w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[13px] text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] disabled:opacity-60"
            />
          </label>
        ) : null}

        {error ? (
          <p
            className="mt-2 rounded-md border border-[color-mix(in_srgb,var(--color-error)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_8%,var(--color-card))] px-2.5 py-1.5 text-xs text-[var(--color-error)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </StorefrontDialog>
    </>
  );
}
