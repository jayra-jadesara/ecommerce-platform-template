"use client";

import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import {
  MEDIA_FOLDER_NAV,
  type MediaFolderFilter,
} from "@/features/media/media-folder-labels";
import { cn } from "@/lib/cn";

const FOLDER_ICONS: Record<MediaFolderFilter, SvgIconComponent> = {
  all: PhotoLibraryOutlinedIcon,
  products: Inventory2OutlinedIcon,
  categories: CategoryOutlinedIcon,
  branding: StorefrontOutlinedIcon,
  cms: HomeOutlinedIcon,
  general: FolderOutlinedIcon,
};

/** Short rail labels — keep the sidebar compact. */
const FOLDER_SHORT_LABELS: Record<MediaFolderFilter, string> = {
  all: "All",
  products: "Products",
  categories: "Categories",
  branding: "Branding",
  cms: "Pages",
  general: "Library",
};

type MediaFolderNavProps = {
  active: MediaFolderFilter;
  onSelect: (folder: MediaFolderFilter) => void;
  disabled?: boolean;
  className?: string;
  /** Compact rail for dense library / picker layouts. */
  size?: "md" | "sm";
  /** Show label next to (or under) the icon. Default true. */
  showLabels?: boolean;
};

/** Folder list with icon + name for the media library rail. */
export function MediaFolderNav({
  active,
  onSelect,
  disabled,
  className,
  size = "sm",
  showLabels = true,
}: MediaFolderNavProps) {
  const compact = size === "sm";

  return (
    <nav
      className={cn("flex w-full flex-col gap-0.5", className)}
      aria-label="Media folders"
    >
      {MEDIA_FOLDER_NAV.map((entry) => {
        const selected = active === entry.id;
        const Icon = FOLDER_ICONS[entry.id];
        const shortLabel = FOLDER_SHORT_LABELS[entry.id];
        return (
          <button
            key={entry.id}
            type="button"
            title={entry.label}
            aria-label={entry.label}
            aria-current={selected ? "true" : undefined}
            disabled={disabled}
            onClick={() => onSelect(entry.id)}
            className={cn(
              "inline-flex w-full items-center rounded-lg transition-colors disabled:opacity-50",
              showLabels
                ? cn("gap-2 px-2", compact ? "h-8" : "h-9")
                : cn(
                    "justify-center",
                    compact ? "h-8 w-8" : "h-10 w-10",
                  ),
              selected
                ? "bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-card))] text-[var(--color-primary)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary)_28%,transparent)]"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]",
            )}
          >
            <Icon
              className={cn(
                "shrink-0",
                compact ? "!text-[1.1rem]" : "!text-[1.35rem]",
              )}
              aria-hidden
            />
            {showLabels ? (
              <span
                className={cn(
                  "truncate font-medium leading-none",
                  compact ? "text-[11px]" : "text-xs",
                )}
              >
                {shortLabel}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
