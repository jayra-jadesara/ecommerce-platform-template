"use client";

import Image from "next/image";
import { useState } from "react";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";

export type SortableImageItem = {
  id: string;
  url: string;
  altText: string;
  isPrimary: boolean;
};

interface SortableImageListProps {
  items: SortableImageItem[];
  canUpdate: boolean;
  canDelete: boolean;
  onSetPrimary: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onAltChange?: (id: string, alt: string) => void;
}

export function SortableImageList({
  items,
  canUpdate,
  canDelete,
  onSetPrimary,
  onDelete,
  onMove,
  onAltChange,
}: SortableImageListProps) {
  const [deleteTarget, setDeleteTarget] = useState<SortableImageItem | null>(
    null,
  );

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
        No images yet. Upload product photos to build the gallery.
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
          >
            <div className="relative h-36 bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-border)_30%)] sm:h-40">
              {item.url ? (
                <Image
                  src={item.url}
                  alt={item.altText || "Product image"}
                  fill
                  className="object-contain p-2"
                  sizes="(max-width: 640px) 50vw, 160px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[var(--color-muted)]">
                  No preview
                </div>
              )}
              {item.isPrimary ? (
                <Chip
                  size="small"
                  color="primary"
                  label="Primary"
                  className="!absolute left-1.5 top-1.5 !h-5 !text-[10px] !shadow-sm"
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 border-t border-[var(--color-border)] p-2">
              {onAltChange ? (
                <label className="block text-[11px] text-[var(--color-muted)]">
                  Alt text
                  <input
                    className="mt-0.5 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-1.5 py-1 text-xs"
                    defaultValue={item.altText}
                    disabled={!canUpdate}
                    onBlur={(event) => onAltChange(item.id, event.target.value)}
                  />
                </label>
              ) : null}
              <div className="mt-auto flex flex-wrap gap-0.5">
                <Tooltip title="Move up">
                  <span>
                    <IconButton
                      size="small"
                      aria-label="Move image up"
                      disabled={!canUpdate || index === 0}
                      onClick={() => onMove(item.id, "up")}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move down">
                  <span>
                    <IconButton
                      size="small"
                      aria-label="Move image down"
                      disabled={!canUpdate || index === items.length - 1}
                      onClick={() => onMove(item.id, "down")}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={item.isPrimary ? "Primary image" : "Set primary"}>
                  <span>
                    <IconButton
                      size="small"
                      aria-label="Set primary image"
                      disabled={!canUpdate || item.isPrimary}
                      onClick={() => onSetPrimary(item.id)}
                    >
                      {item.isPrimary ? (
                        <StarIcon fontSize="small" color="primary" />
                      ) : (
                        <StarBorderIcon fontSize="small" />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Delete">
                  <span>
                    <IconButton
                      size="small"
                      aria-label="Delete image"
                      color="error"
                      disabled={!canDelete}
                      onClick={() => setDeleteTarget(item)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Delete product image?"
        message="Delete this product image? This cannot be undone."
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
