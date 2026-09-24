"use client";

import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SwitchAccountOutlinedIcon from "@mui/icons-material/SwitchAccountOutlined";
import IconButton from "@mui/material/IconButton";
import { getAdminPath } from "@/config/admin-route";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

type TeamMemberRowActionsProps = {
  userId: string;
  label: string;
  showEdit: boolean;
  showActivity: boolean;
  showOpenAs: boolean;
  showRemove: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onRemove: () => void;
  /** Kept for API compatibility; open-as uses a new-tab link now. */
  onError?: (message: string) => void;
};

/**
 * Edit Role · Activity (new tab) · View as (new tab) · Delete.
 */
export function TeamMemberRowActions({
  userId,
  label,
  showEdit,
  showActivity,
  showOpenAs,
  showRemove,
  disabled = false,
  onEdit,
  onRemove,
}: TeamMemberRowActionsProps) {
  const hasAny = showEdit || showActivity || showOpenAs || showRemove;

  if (!hasAny) {
    return (
      <span className="text-[12px] text-[var(--color-muted)]">—</span>
    );
  }

  const iconLinkClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-full transition";

  return (
    <div className="inline-flex items-center gap-1.5">
      {showEdit ? (
        <button
          type="button"
          className={cn(adminBtn("outline"), "!min-h-8 !px-2.5 !text-xs")}
          disabled={disabled}
          onClick={onEdit}
        >
          Edit Role
        </button>
      ) : null}

      {showActivity ? (
        <a
          href={getAdminPath(`/team/${userId}`)}
          target="_blank"
          rel="noopener noreferrer"
          title="Activity (opens in new tab)"
          aria-label={`Activity for ${label}`}
          aria-disabled={disabled || undefined}
          className={cn(
            iconLinkClass,
            "text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] hover:text-[var(--color-foreground)]",
            disabled && "pointer-events-none opacity-55",
          )}
          onClick={(event) => {
            if (disabled) event.preventDefault();
          }}
        >
          <HistoryOutlinedIcon sx={{ fontSize: 18 }} />
        </a>
      ) : null}

      {showOpenAs ? (
        <a
          href={getAdminPath(`/view-as/${userId}`)}
          target="_blank"
          rel="noopener noreferrer"
          title="View as this person (new tab) — their menus only; your Super Admin tab stays open"
          aria-label={`View admin as ${label}`}
          aria-disabled={disabled || undefined}
          className={cn(
            adminBtn("outline"),
            "!min-h-8 !gap-1 !px-2 !text-xs text-[var(--color-primary)]",
            disabled && "pointer-events-none opacity-55",
          )}
          onClick={(event) => {
            if (disabled) event.preventDefault();
          }}
        >
          <SwitchAccountOutlinedIcon sx={{ fontSize: 16 }} />
          View as
        </a>
      ) : null}

      {showRemove ? (
        <IconButton
          size="small"
          title="Remove from team"
          aria-label={`Remove ${label} from team`}
          disabled={disabled}
          onClick={onRemove}
          sx={{
            color: "var(--color-error)",
            "&:hover": {
              backgroundColor:
                "color-mix(in srgb, var(--color-error) 12%, transparent)",
            },
          }}
        >
          <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      ) : null}
    </div>
  );
}
