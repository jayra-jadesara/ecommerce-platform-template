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

type MediaFolderNavProps = {
  active: MediaFolderFilter;
  onSelect: (folder: MediaFolderFilter) => void;
  disabled?: boolean;
  className?: string;
};

/** Icon-only folder list — label exposed via title + aria-label. */
export function MediaFolderNav({
  active,
  onSelect,
  disabled,
  className,
}: MediaFolderNavProps) {
  return (
    <nav
      className={cn("flex flex-col gap-1", className)}
      aria-label="Media folders"
    >
      {MEDIA_FOLDER_NAV.map((entry) => {
        const selected = active === entry.id;
        const Icon = FOLDER_ICONS[entry.id];
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
              "inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors disabled:opacity-50",
              selected
                ? "bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-card))] text-[var(--color-primary)]"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]",
            )}
          >
            <Icon className="!text-[1.35rem]" aria-hidden />
          </button>
        );
      })}
    </nav>
  );
}
