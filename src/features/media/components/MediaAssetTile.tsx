"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type MediaAssetTileProps = {
  fileName: string;
  altText?: string | null;
  previewUrl?: string | null;
  meta?: string;
  disabled?: boolean;
  /** Multi-select checkbox (library). */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Click selects the asset (picker). */
  onSelect?: () => void;
  /** Library hover actions. */
  onCopyPath?: () => void;
  onCopyLink?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  className?: string;
};

function TinyAction({
  label,
  danger,
  disabled,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md border backdrop-blur-sm transition",
        "border-white/20 bg-black/45 text-white hover:bg-black/65",
        danger && "hover:border-red-300/50 hover:bg-red-600/80",
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}

/** Dense media thumbnail — hover reveals actions / selection. */
export function MediaAssetTile({
  fileName,
  altText,
  previewUrl,
  meta,
  disabled,
  checked,
  onCheckedChange,
  onSelect,
  onCopyPath,
  onCopyLink,
  onDelete,
  canDelete,
  className,
}: MediaAssetTileProps) {
  const selectable = Boolean(onSelect);
  const multiSelect = Boolean(onCheckedChange);
  const hasActions = Boolean(onCopyPath || onCopyLink || onDelete);
  const isChecked = Boolean(checked);

  const body = (
    <>
      <div className="relative aspect-square overflow-hidden bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-card))]">
        {previewUrl ? (
          // Signed private URLs must not go through next/image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={altText || fileName}
            className="h-full w-full object-contain p-1 transition duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-1.5 text-center text-[9px] leading-tight text-[var(--color-muted)]">
            {fileName}
          </div>
        )}

        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 opacity-0 transition duration-200",
            "group-hover:opacity-100 group-focus-within:opacity-100",
            isChecked && "opacity-100 from-black/35",
          )}
        />

        {multiSelect ? (
          <button
            type="button"
            aria-label={isChecked ? "Deselect image" : "Select image"}
            aria-pressed={isChecked}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onCheckedChange?.(!isChecked);
            }}
            className={cn(
              "absolute left-1.5 top-1.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md border transition",
              isChecked
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-button-foreground)] opacity-100"
                : "border-white/40 bg-black/35 text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
              "disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            {isChecked ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : null}
          </button>
        ) : null}

        {hasActions ? (
          <div
            className={cn(
              "absolute inset-x-0 top-0 flex justify-end gap-1 p-1.5 opacity-0 transition duration-200",
              "group-hover:opacity-100 group-focus-within:opacity-100",
              "pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto",
            )}
          >
            {onCopyPath ? (
              <TinyAction label="Copy path" onClick={onCopyPath}>
                <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />
              </TinyAction>
            ) : null}
            {onCopyLink && previewUrl ? (
              <TinyAction label="Copy link" onClick={onCopyLink}>
                <LinkRoundedIcon sx={{ fontSize: 14 }} />
              </TinyAction>
            ) : null}
            {onDelete ? (
              <TinyAction
                label="Delete"
                danger
                disabled={!canDelete || disabled}
                onClick={onDelete}
              >
                <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
              </TinyAction>
            ) : null}
          </div>
        ) : null}

        {selectable ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 ring-inset transition",
              "group-hover:ring-2 group-hover:ring-[var(--color-primary)]",
              "group-focus-visible:ring-2 group-focus-visible:ring-[var(--color-primary)]",
            )}
          />
        ) : null}

        {isChecked ? (
          <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-[var(--color-primary)]" />
        ) : null}
      </div>

      <div className="space-y-0.5 border-t border-[var(--color-border)] px-1.5 py-1.5">
        <p
          className="truncate text-[10px] font-medium leading-tight text-[var(--color-foreground)]"
          title={fileName}
        >
          {fileName}
        </p>
        {meta ? (
          <p className="truncate text-[9px] leading-tight text-[var(--color-muted)]">
            {meta}
          </p>
        ) : null}
      </div>
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          "group w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-left shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_3%,transparent)] transition",
          "hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:shadow-[0_6px_16px_color-mix(in_srgb,var(--color-foreground)_8%,transparent)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          "disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_3%,transparent)] transition",
        isChecked
          ? "border-[var(--color-primary)] shadow-[0_4px_12px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
          : "hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:shadow-[0_6px_16px_color-mix(in_srgb,var(--color-foreground)_8%,transparent)]",
        className,
      )}
    >
      {body}
    </div>
  );
}
