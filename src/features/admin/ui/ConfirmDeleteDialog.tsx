"use client";

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

export type ConfirmDeleteDialogProps = {
  open: boolean;
  title: string;
  message: string;
  /** When set, deletion is blocked and this safer action is offered. */
  blocked?: boolean;
  warningTone?: boolean;
  /** danger = delete styling; default = discard / neutral confirm. */
  confirmTone?: "danger" | "default";
  confirmLabel?: string;
  safeActionLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  pendingLabel?: string;
  onClose: () => void;
  onConfirm?: () => void;
  onSafeAction?: () => void;
};

/**
 * Shared confirmation dialog for destructive and discard actions.
 * Prefer deactivate/archive when blocked.
 */
export function ConfirmDeleteDialog({
  open,
  title,
  message,
  blocked = false,
  warningTone = false,
  confirmTone = "danger",
  confirmLabel = "Delete",
  safeActionLabel = "Deactivate",
  cancelLabel = "Cancel",
  pending = false,
  pendingLabel,
  onClose,
  onConfirm,
  onSafeAction,
}: ConfirmDeleteDialogProps) {
  const titleId = "admin-confirm-dialog-title";
  const descId = "admin-confirm-dialog-desc";
  const busyLabel =
    pendingLabel ??
    (confirmTone === "danger" ? "Deleting…" : "Working…");

  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>
        <p
          id={descId}
          className={cn(
            "text-sm",
            warningTone || blocked
              ? "text-[var(--color-warning)]"
              : "text-[var(--color-muted)]",
          )}
        >
          {message}
        </p>
      </DialogContent>
      <DialogActions className="gap-2 px-4 pb-4">
        <button
          type="button"
          className={adminBtn("outline")}
          disabled={pending}
          onClick={onClose}
        >
          {cancelLabel}
        </button>
        {blocked && onSafeAction ? (
          <button
            type="button"
            className={adminBtn("primary")}
            disabled={pending}
            onClick={onSafeAction}
          >
            {pending ? "Working…" : safeActionLabel}
          </button>
        ) : null}
        {!blocked && onConfirm ? (
          <button
            type="button"
            className={cn(
              adminBtn("primary"),
              confirmTone === "danger" && "!bg-[var(--color-error)]",
            )}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? busyLabel : confirmLabel}
          </button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
