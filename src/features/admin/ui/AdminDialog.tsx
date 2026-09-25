"use client";

import CloseIcon from "@mui/icons-material/Close";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import { useId, type ReactNode } from "react";
import { adminFormStack } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

/** Shared paper styling for all admin dialogs. */
export const adminDialogPaperSx = {
  margin: 2,
  overflow: "hidden",
  borderRadius: "16px",
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-card)",
  backgroundImage: "none",
  boxShadow:
    "0 24px 64px color-mix(in srgb, var(--color-foreground) 18%, transparent)",
  maxHeight: "calc(100vh - 2rem)",
  display: "flex",
  flexDirection: "column",
} as const;

/** Blurred dimmed backdrop for all admin dialogs. */
export const adminDialogBackdropSx = {
  backgroundColor:
    "color-mix(in srgb, var(--color-foreground) 28%, transparent)",
  backdropFilter: "blur(6px)",
} as const;

/** Close / icon button hover treatment inside dialog headers. */
export const adminDialogIconBtnSx = {
  color: "var(--color-muted)",
  borderRadius: "10px",
  border: "1px solid transparent",
  "&:hover": {
    color: "var(--color-foreground)",
    backgroundColor:
      "color-mix(in srgb, var(--color-primary) 8%, var(--color-card))",
    borderColor:
      "color-mix(in srgb, var(--color-primary) 22%, var(--color-border))",
  },
} as const;

export type AdminDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Icon shown in the premium header badge. */
  icon?: ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg";
  pending?: boolean;
  /** Hide the header close (X) button. */
  hideClose?: boolean;
  /** When false, body does not scroll. Default true. */
  contentScroll?: boolean;
  /** Extra class on DialogContent. */
  contentClassName?: string;
  /** Optional footer (actions bar). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Override generated title element id. */
  titleId?: string;
};

/**
 * Premium admin dialog shell — gradient header, icon, blur backdrop, rounded paper.
 * Use directly or via AdminFormDialog / ConfirmDeleteDialog.
 */
export function AdminDialog({
  open,
  onClose,
  title,
  description,
  icon,
  maxWidth = "sm",
  pending = false,
  hideClose = false,
  contentScroll = true,
  contentClassName,
  actions,
  children,
  className,
  titleId: titleIdProp,
}: AdminDialogProps) {
  const reactId = useId();
  const titleId = titleIdProp ?? `admin-dialog-title-${reactId}`;
  const descId = description ? `${titleId}-desc` : undefined;

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
        backdrop: { sx: adminDialogBackdropSx },
        paper: {
          className: "admin-form-dialog-paper",
          sx: adminDialogPaperSx,
        },
      }}
    >
      <div className="relative shrink-0 overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_12%,var(--color-card)),var(--color-card)_62%)] px-4 pb-3.5 pt-4">
        <div
          className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-card)] text-[var(--color-primary)] shadow-[0_1px_3px_color-mix(in_srgb,var(--color-foreground)_10%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))]">
                {icon}
              </div>
            ) : null}
            <div className={cn("min-w-0", icon ? "pt-0.5" : "")}>
              <h2
                id={titleId}
                className="text-[1rem] font-semibold tracking-tight text-[var(--color-foreground)]"
              >
                {title}
              </h2>
              {description ? (
                <p
                  id={descId}
                  className="mt-0.5 text-[12px] leading-snug text-[var(--color-muted)]"
                >
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {!hideClose ? (
            <IconButton
              size="small"
              aria-label="Close dialog"
              disabled={pending}
              onClick={onClose}
              sx={adminDialogIconBtnSx}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          ) : null}
        </div>
      </div>

      <DialogContent
        className={cn(adminFormStack(), "!px-4 !pb-4 !pt-4", contentClassName)}
        sx={{
          overflowY: contentScroll ? "auto" : "hidden",
          flex: contentScroll ? "1 1 auto" : "0 1 auto",
          minHeight: 0,
          ...(actions ? { paddingBottom: "12px" } : null),
        }}
      >
        {children}
      </DialogContent>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_45%,var(--color-card))] px-4 py-3">
          {actions}
        </div>
      ) : null}
    </Dialog>
  );
}
