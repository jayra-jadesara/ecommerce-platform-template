"use client";

import type { ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

export type AdminFormDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  /** Prefer compact forms so the dialog fits without an inner scrollbar. */
  maxWidth?: "xs" | "sm" | "md" | "lg";
  /** Tighter title, padding, and actions for simple forms. */
  dense?: boolean;
  pending?: boolean;
  error?: string | null;
  cancelLabel?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  children: ReactNode;
  className?: string;
};

/**
 * Shared admin create/edit dialog — compact paper, no content scrollbar by default.
 */
export function AdminFormDialog({
  open,
  title,
  description,
  maxWidth = "sm",
  dense = false,
  pending = false,
  error = null,
  cancelLabel = "Cancel",
  confirmLabel = "Save",
  pendingLabel = "Saving…",
  onClose,
  onConfirm,
  children,
  className,
}: AdminFormDialogProps) {
  const titleId = "admin-form-dialog-title";
  const descId = description ? "admin-form-dialog-desc" : undefined;

  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onClose}
      fullWidth
      maxWidth={maxWidth}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={className}
      slotProps={{
        paper: {
          className: "admin-form-dialog-paper",
          sx: {
            margin: dense ? 1.5 : 2,
            maxHeight: "calc(100vh - 2rem)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        },
      }}
    >
      <DialogTitle
        id={titleId}
        className={
          dense ? "!px-3.5 !pb-0.5 !pt-3 !text-base" : "!pb-1 !pt-4 !text-lg"
        }
      >
        {title}
      </DialogTitle>
      <DialogContent
        className={dense ? "!px-3.5 !pt-1.5" : "!pt-2"}
        sx={{
          overflow: "visible",
          flex: "0 1 auto",
          pb: dense ? 0.5 : 1,
        }}
      >
        {description ? (
          <p
            id={descId}
            className={cn(
              "leading-snug text-[var(--color-muted)]",
              dense ? "mb-2 text-[11px]" : "mb-3 text-sm",
            )}
          >
            {description}
          </p>
        ) : null}
        {error ? (
          <p className="mb-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {children}
      </DialogContent>
      <DialogActions
        className={
          dense ? "gap-1.5 !px-3.5 !pb-2.5 !pt-0.5" : "gap-2 !px-4 !pb-3 !pt-1"
        }
      >
        <button
          type="button"
          className={cn(
            adminBtn("secondary"),
            dense && "!min-h-8 !px-2.5 !text-xs",
          )}
          disabled={pending}
          onClick={onClose}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={cn(
            adminBtn("primary"),
            dense && "!min-h-8 !px-2.5 !text-xs",
          )}
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? pendingLabel : confirmLabel}
        </button>
      </DialogActions>
    </Dialog>
  );
}
