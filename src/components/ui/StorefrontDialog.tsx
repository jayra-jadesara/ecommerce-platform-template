"use client";

import Dialog from "@mui/material/Dialog";
import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export type StorefrontDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  pending?: boolean;
  maxWidth?: "xs" | "sm" | "md";
  /** Tighter padding, smaller type — cancel / quick confirm flows */
  compact?: boolean;
  className?: string;
};

/**
 * Premium storefront modal — soft scrim, rounded panel, storefront tokens.
 * Use for cancel / confirm / reason flows on the customer account.
 */
export function StorefrontDialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  pending = false,
  maxWidth = "sm",
  compact = false,
  className,
}: StorefrontDialogProps) {
  const titleId = useId();
  const descId = useId();

  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onClose}
      maxWidth={compact ? false : maxWidth}
      fullWidth={!compact}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor:
              "color-mix(in srgb, var(--color-foreground) 28%, transparent)",
            backdropFilter: "blur(6px)",
          },
        },
        paper: {
          className: cn(
            "!overflow-hidden !border !border-[var(--color-border)] !bg-[var(--color-card)] !shadow-[0_20px_48px_color-mix(in_srgb,var(--color-foreground)_16%,transparent)]",
            compact ? "!rounded-xl" : "!rounded-2xl",
            className,
          ),
          sx: compact
            ? {
                backgroundImage: "none",
                marginLeft: "20px",
                marginRight: "20px",
                marginTop: "16px",
                marginBottom: "16px",
                width: "calc(100% - 40px)",
                maxWidth: "22rem",
              }
            : {
                backgroundImage: "none",
                margin: "16px",
              },
        },
      }}
    >
      <div
        className={cn(
          compact ? "px-4 pb-1 pt-3.5" : "px-5 pb-2 pt-5 md:px-6 md:pt-6",
        )}
      >
        <h2
          id={titleId}
          className={cn(
            "font-[family-name:var(--font-display)] font-semibold tracking-tight text-[var(--color-foreground)]",
            compact ? "text-base leading-snug" : "text-xl md:text-[1.35rem]",
          )}
        >
          {title}
        </h2>
        {description ? (
          <div
            id={descId}
            className={cn(
              "text-[var(--color-muted)]",
              compact
                ? "mt-1 text-[12px] leading-snug"
                : "mt-1.5 text-sm leading-relaxed",
            )}
          >
            {description}
          </div>
        ) : null}
      </div>

      {children ? (
        <div className={cn(compact ? "px-4 py-1.5" : "px-5 py-3 md:px-6")}>
          {children}
        </div>
      ) : null}

      {actions ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-end border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_65%,var(--color-card))]",
            compact ? "gap-1.5 px-4 py-2.5" : "gap-2 px-5 py-3.5 md:px-6",
          )}
        >
          {actions}
        </div>
      ) : null}
    </Dialog>
  );
}
