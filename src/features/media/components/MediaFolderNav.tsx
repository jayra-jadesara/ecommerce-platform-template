"use client";

import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import ContactMailOutlinedIcon from "@mui/icons-material/ContactMailOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import {
  MEDIA_FOLDER_HINTS,
  MEDIA_FOLDER_LABELS,
  MEDIA_FOLDER_NAV_GROUPS,
  type MediaFolderFilter,
} from "@/features/media/media-folder-labels";
import type { MediaFolder } from "@/features/media/validation";
import { cn } from "@/lib/cn";

const FOLDER_ICONS: Record<MediaFolder, SvgIconComponent> = {
  products: Inventory2OutlinedIcon,
  categories: CategoryOutlinedIcon,
  branding: StorefrontOutlinedIcon,
  cms: HomeOutlinedIcon,
  about: InfoOutlinedIcon,
  contact: ContactMailOutlinedIcon,
  career: WorkOutlineOutlinedIcon,
  banners: CampaignOutlinedIcon,
  blog: ArticleOutlinedIcon,
  general: FolderOutlinedIcon,
};

type MediaFolderNavProps = {
  active: MediaFolderFilter;
  onSelect: (folder: MediaFolderFilter) => void;
  disabled?: boolean;
  className?: string;
  /** Compact rail for dense library / picker layouts. */
  size?: "md" | "sm";
  /** Show label next to the icon. Default true. */
  showLabels?: boolean;
  /** Include the “All” entry at the top. Default true. */
  showAll?: boolean;
};

/** Folder list with icon + name — page-wise groups match Content menu. */
export function MediaFolderNav({
  active,
  onSelect,
  disabled,
  className,
  size = "sm",
  showLabels = true,
  showAll = true,
}: MediaFolderNavProps) {
  const compact = size === "sm";

  function renderItem(id: MediaFolderFilter, label: string, hint?: string) {
    const selected = active === id;
    const Icon =
      id === "all" ? PhotoLibraryOutlinedIcon : FOLDER_ICONS[id];
    return (
      <button
        key={id}
        type="button"
        title={hint ?? label}
        aria-label={hint ?? label}
        aria-current={selected ? "true" : undefined}
        disabled={disabled}
        onClick={() => onSelect(id)}
        className={cn(
          "inline-flex w-full items-center rounded-lg transition-colors disabled:opacity-50",
          showLabels
            ? cn("gap-2 px-2", compact ? "h-8" : "h-9")
            : cn("justify-center", compact ? "h-8 w-8" : "h-10 w-10"),
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
            {label}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <nav
      className={cn("flex w-full flex-col gap-0.5", className)}
      aria-label="Media folders"
    >
      {showAll
        ? renderItem(
            "all",
            "All",
            "Browse every folder — same library as Images & Files",
          )
        : null}

      {MEDIA_FOLDER_NAV_GROUPS.map((group) => (
        <div key={group.id} className="mt-1.5 first:mt-0">
          {showLabels ? (
            <p className="px-2 pb-0.5 pt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
              {group.label}
            </p>
          ) : null}
          <div className="flex flex-col gap-0.5">
            {group.folders.map((folder) =>
              renderItem(
                folder,
                MEDIA_FOLDER_LABELS[folder],
                MEDIA_FOLDER_HINTS[folder],
              ),
            )}
          </div>
        </div>
      ))}
    </nav>
  );
}
