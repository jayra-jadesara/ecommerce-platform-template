"use client";

import Image from "next/image";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

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
  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
        No images yet. Upload product photos to build the gallery.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]"
        >
          <div className="relative aspect-square bg-[var(--color-surface)]">
            <Image
              src={item.url}
              alt={item.altText || "Product image"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 220px"
            />
            {item.isPrimary ? (
              <Chip
                size="small"
                color="primary"
                label="Primary"
                className="!absolute left-2 top-2"
              />
            ) : null}
          </div>
          <div className="space-y-2 p-3">
            {onAltChange ? (
              <label className="block text-xs text-[var(--color-muted)]">
                Alt text
                <input
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm"
                  defaultValue={item.altText}
                  disabled={!canUpdate}
                  onBlur={(event) => onAltChange(item.id, event.target.value)}
                />
              </label>
            ) : null}
            <div className="flex flex-wrap gap-1">
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
                    onClick={() => {
                      if (window.confirm("Delete this product image?")) {
                        onDelete(item.id);
                      }
                    }}
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
  );
}
