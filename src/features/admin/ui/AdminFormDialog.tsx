"use client";

import type { ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
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
  /**
   * When false, content does not scroll — keep children short enough to fit.
   * Default true (tall forms can scroll; footer stays pinned).
   */
  contentScroll?: boolean;
  pending?: boolean;
  error?: string | null;
  cancelLabel?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  /** Hide the secondary cancel button (e.g. view-only dialogs). */
  hideCancel?: boolean;
  /** Hide the whole footer (custom actions live in children). */
  hideActions?: boolean;
  /** Show an X control in the title bar. */
  showCloseIcon?: boolean;
  /**
   * Called by the X button and backdrop/Escape.
   * Defaults to `onClose` (cancel button still uses `onClose`).
   */
  onDismiss?: () => void;
  onClose: () => void;
  onConfirm: () => void;
  children: ReactNode;
  className?: string;
};

/**
 * Shared admin create/edit dialog — compact paper, footer always visible.
 */
export function AdminFormDialog({
  open,
  title,
  description,
  maxWidth = "sm",
  dense = false,
  contentScroll = true,
  pending = false,
  error = null,
  cancelLabel = "Cancel",
  confirmLabel = "Save",
  pendingLabel = "Saving…",
  hideCancel = false,
  hideActions = false,
  showCloseIcon = false,
  onDismiss,
  onClose,
  onConfirm,
  children,
  className,
}: AdminFormDialogProps) {
  const titleId = "admin-form-dialog-title";
  const descId = description ? "admin-form-dialog-desc" : undefined;
  const dismiss = onDismiss ?? onClose;

  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : dismiss}
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
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
          pr: showCloseIcon ? (dense ? 1.25 : 1.5) : undefined,
        }}
      >
        <span className="min-w-0 flex-1">{title}</span>
        {showCloseIcon ? (
          <IconButton
            type="button"
            size="small"
            aria-label="Close dialog"
            disabled={pending}
            onClick={dismiss}
            className="!-mt-0.5 !text-[var(--color-muted)] hover:!bg-[var(--color-surface)] hover:!text-[var(--color-foreground)]"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : null}
      </DialogTitle>
      <DialogContent
        className={dense ? "!px-3.5 !pt-1.5" : "!pt-2"}
        sx={{
          overflowY: contentScroll ? "auto" : "hidden",
          flex: contentScroll ? "1 1 auto" : "0 1 auto",
          minHeight: 0,
          pb: hideActions ? (dense ? 2 : 3) : dense ? 0.5 : 1,
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
      {!hideActions ? (
        <DialogActions
          className={
            dense
              ? "gap-1.5 !px-3.5 !pb-2.5 !pt-0.5"
              : "gap-2 !px-4 !pb-3 !pt-1"
          }
          sx={{
            flexShrink: 0,
            borderTop: "1px solid var(--color-border)",
            mt: 0,
          }}
        >
          {!hideCancel ? (
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
          ) : null}
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
      ) : null}
    </Dialog>
  );
}
