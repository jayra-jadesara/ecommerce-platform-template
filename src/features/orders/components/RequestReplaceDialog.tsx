"use client";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { requestOrderReplaceAction } from "@/features/orders/actions";
import type { OrderItemView } from "@/features/orders/types";
import {
  coerceReplaceReasonOptions,
  formatReplaceWindowRemaining,
  isOtherReplaceReason,
  type ReplaceStoreRules,
} from "@/features/shipping/policies";
import { formatReplacePhotoHint, mbToBytes } from "@/features/media/upload-limits";
import { sfBtn } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

export function RequestReplaceDialog({
  orderId,
  item,
  rules,
  deliveredAt,
  attemptsUsed,
  open,
  onClose,
}: {
  orderId: string;
  item: OrderItemView;
  rules: ReplaceStoreRules;
  deliveredAt: string | null;
  attemptsUsed: number;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const photoMaxMb = rules.photoMaxMb ?? 1;
  const photoMaxBytes = mbToBytes(photoMaxMb);
  const reasonOptions = useMemo(
    () => coerceReplaceReasonOptions(rules.reasonOptions),
    [rules.reasonOptions],
  );
  const defaultReason = reasonOptions[0] ?? "Other";
  const [reasonCode, setReasonCode] = useState(defaultReason);
  const [otherText, setOtherText] = useState("");
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewUrl = useMemo(
    () => (photo ? URL.createObjectURL(photo) : null),
    [photo],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const photoRequired = rules.photoRequired;
  const attemptsLeft = Math.max(0, rules.maxAttempts - attemptsUsed);
  const windowCopy = formatReplaceWindowRemaining(
    deliveredAt,
    rules.windowHours,
  );

  function resetAndClose() {
    setReasonCode(defaultReason);
    setOtherText("");
    setNote("");
    setQuantity(1);
    setPhoto(null);
    setError(null);
    setSuccess(null);
    onClose();
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const other = isOtherReplaceReason(reasonCode);
    if (other && otherText.trim().length < 3) {
      setError("Please write a short reason (at least 3 characters).");
      return;
    }
    if (photoRequired && !photo) {
      setError("A photo is required for replacement requests.");
      return;
    }

    const formData = new FormData();
    formData.set("orderId", orderId);
    formData.set("orderItemId", item.id);
    formData.set("reasonCode", reasonCode);
    formData.set("reason", other ? otherText.trim() : reasonCode);
    formData.set("customerNote", note);
    formData.set("quantity", String(quantity));
    if (photo) formData.set("photo", photo);

    startTransition(async () => {
      const result = await requestOrderReplaceAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      router.refresh();
      window.setTimeout(() => resetAndClose(), 700);
    });
  }

  return (
    <Dialog open={open} onClose={pending ? undefined : resetAndClose} fullWidth maxWidth="sm">
      <DialogTitle id={titleId}>Request replacement</DialogTitle>
      <DialogContent>
        <p className="mb-2 text-sm text-[var(--color-muted)]">
          {item.productName}
          {item.variantName ? ` · ${item.variantName}` : ""}
        </p>
        <p className="mb-4 text-xs text-[var(--color-muted)]">
          {[windowCopy, `${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <form className="space-y-4" onSubmit={onSubmit}>
          <FormControl disabled={pending}>
            <FormLabel id={`${titleId}-reason`}>Why do you need a replacement?</FormLabel>
            <RadioGroup
              aria-labelledby={`${titleId}-reason`}
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
            >
              {reasonOptions.map((option) => (
                <FormControlLabel
                  key={option}
                  value={option}
                  control={<Radio size="small" />}
                  label={
                    isOtherReplaceReason(option)
                      ? "Other (write yours)"
                      : option
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>

          {isOtherReplaceReason(reasonCode) ? (
            <TextField
              label="Describe the issue"
              value={otherText}
              onChange={(event) => setOtherText(event.target.value)}
              required
              fullWidth
              multiline
              minRows={2}
              disabled={pending}
              helperText="Required when you choose Other"
            />
          ) : null}

          <div>
            <label
              htmlFor={`${titleId}-qty`}
              className="mb-1 block text-sm font-medium text-[var(--color-foreground)]"
            >
              Quantity to replace
            </label>
            <TextField
              id={`${titleId}-qty`}
              type="number"
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  Math.min(
                    item.quantity,
                    Math.max(1, Number(event.target.value) || 1),
                  ),
                )
              }
              fullWidth
              disabled={pending}
              slotProps={{
                htmlInput: { min: 1, max: item.quantity },
                inputLabel: { shrink: true },
              }}
              helperText={`Up to ${item.quantity}`}
            />
          </div>

          <TextField
            label="Extra note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            fullWidth
            disabled={pending}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">
              Photo {photoRequired ? "(required)" : "(optional)"}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={pending}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file && file.size > photoMaxBytes) {
                  setError(
                    `Photo must be ${photoMaxMb} MB or smaller.`,
                  );
                  setPhoto(null);
                  event.target.value = "";
                  return;
                }
                setError(null);
                setPhoto(file);
              }}
              className="block w-full text-sm text-[var(--color-muted)]"
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {formatReplacePhotoHint(photoMaxMb)}
              {photoRequired
                ? ". Required by the store."
                : ". Optional — helps review faster."}
            </p>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img
                src={previewUrl}
                alt="Selected photo preview"
                className="mt-3 h-28 w-28 rounded-xl border border-[var(--color-border)] object-cover"
              />
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-green-800">{success}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={pending}
              onClick={resetAndClose}
              className={cn(sfBtn("ghost"), "text-sm")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(sfBtn("primary"), "text-sm")}
            >
              {pending ? "Sending…" : "Submit request"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
