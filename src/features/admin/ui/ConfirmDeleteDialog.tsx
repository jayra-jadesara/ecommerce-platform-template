"use client";

import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { AdminDialog } from "@/features/admin/ui/AdminDialog";
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
  const busyLabel =
    pendingLabel ??
    (confirmTone === "danger" ? "Deleting…" : "Working…");
  const showWarning = warningTone || blocked || confirmTone === "danger";

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={title}
      description={
        showWarning
          ? "This action needs your confirmation."
          : "Please confirm to continue."
      }
      maxWidth="sm"
      pending={pending}
      icon={
        showWarning ? (
          <WarningAmberOutlinedIcon
            sx={{
              fontSize: 22,
              color:
                confirmTone === "danger"
                  ? "var(--color-error)"
                  : "var(--color-warning, var(--color-primary))",
            }}
          />
        ) : (
          <DeleteOutlineOutlinedIcon sx={{ fontSize: 22 }} />
        )
      }
      actions={
        <>
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
        </>
      }
    >
      <p
        className={cn(
          "text-[13px] leading-relaxed",
          warningTone || blocked
            ? "text-[var(--color-warning,var(--color-foreground))]"
            : "text-[var(--color-muted)]",
        )}
      >
        {message}
      </p>
    </AdminDialog>
  );
}
