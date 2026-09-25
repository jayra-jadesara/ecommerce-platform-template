"use client";

import type { ReactNode } from "react";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { AdminDialog } from "@/features/admin/ui/AdminDialog";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

export type AdminFormDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  /** Prefer compact forms so the dialog fits without an inner scrollbar. */
  maxWidth?: "xs" | "sm" | "md" | "lg";
  /** Tighter padding and actions for simple forms. */
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
  /** Show an X control in the title bar. Default true for premium shell. */
  showCloseIcon?: boolean;
  /** Optional header icon; defaults to edit icon. */
  icon?: ReactNode;
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
 * Shared admin create/edit dialog — premium shell, footer always visible.
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
  showCloseIcon = true,
  icon,
  onDismiss,
  onClose,
  onConfirm,
  children,
  className,
}: AdminFormDialogProps) {
  const dismiss = onDismiss ?? onClose;

  return (
    <AdminDialog
      open={open}
      onClose={dismiss}
      title={title}
      description={description}
      maxWidth={maxWidth}
      pending={pending}
      hideClose={!showCloseIcon}
      contentScroll={contentScroll}
      contentClassName={dense ? "!px-3.5 !pb-3 !pt-3" : undefined}
      className={className}
      icon={
        icon ?? <EditOutlinedIcon sx={{ fontSize: 22 }} aria-hidden />
      }
      actions={
        hideActions ? undefined : (
          <>
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
          </>
        )
      }
    >
      {error ? (
        <p
          className="rounded-xl border border-[color-mix(in_srgb,var(--color-error)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_8%,var(--color-card))] px-3 py-2 text-[13px] text-[var(--color-error)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {children}
    </AdminDialog>
  );
}
