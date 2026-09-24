"use client";

import type { ReactNode } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  AdminDragHandle,
  AdminSortableItem,
  AdminSortableList,
  adminSortableIds,
  reorderBySortableIds,
} from "@/features/admin/ui/AdminSortable";
import { cn } from "@/lib/cn";

export type AdminReasonOptionsEditorProps = {
  options: string[];
  locked?: boolean;
  error?: string;
  isOther: (label: string) => boolean;
  coerce: (value: unknown) => string[];
  onChange: (next: string[]) => void;
  addLabel?: string;
  max?: number;
};

function IconBtn({
  label,
  disabled,
  onClick,
  danger,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition",
        "border-transparent text-[var(--color-muted)]",
        "hover:border-[var(--color-border)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)]",
        "disabled:pointer-events-none disabled:opacity-30",
        danger &&
          "hover:border-[color-mix(in_srgb,var(--color-error)_35%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-error)_8%,var(--color-card))] hover:text-[var(--color-error)]",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Compact premium list editor for cancel / replace reason presets.
 */
export function AdminReasonOptionsEditor({
  options,
  locked = false,
  error,
  isOther,
  coerce,
  onChange,
  addLabel = "Add reason",
  max = 12,
}: AdminReasonOptionsEditorProps) {
  const setOptions = (next: string[]) => onChange(coerce(next));
  const canRemoveMore =
    options.filter((item) => !isOther(item)).length > 1;
  const SORT_PREFIX = "reason";

  return (
    <div className="space-y-2">
      <AdminSortableList
        ids={adminSortableIds(options.length, SORT_PREFIX)}
        disabled={locked}
        className={cn(
          "overflow-hidden rounded-xl border border-[var(--color-border)]",
          "bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))]",
        )}
        onReorder={(activeId, overId) => {
          if (locked) return;
          const next = reorderBySortableIds(
            options,
            activeId,
            overId,
            SORT_PREFIX,
          );
          if (next) setOptions(next);
        }}
      >
        {options.map((option, index) => {
          const other = isOther(option);
          const isLast = index === options.length - 1;
          return (
            <AdminSortableItem
              key={`${SORT_PREFIX}-${index}`}
              id={`${SORT_PREFIX}-${index}`}
              disabled={locked}
            >
              {({ setNodeRef, style, isDragging, attributes, listeners }) => (
                <li
                  ref={setNodeRef}
                  style={style}
                  className={cn(
                    "group flex items-center gap-1.5 px-2 py-1.5",
                    !isLast && "border-b border-[var(--color-border)]",
                    isDragging && "z-10 bg-[var(--color-card)] opacity-90 shadow-md",
                  )}
                >
                  <AdminDragHandle
                    disabled={locked}
                    attributes={attributes}
                    listeners={listeners}
                    className="!h-7 !w-7 !self-center rounded-md"
                  />
                  <span
                    className="w-5 shrink-0 text-center text-[10px] font-medium tabular-nums text-[var(--color-muted)]"
                    aria-hidden
                  >
                    {index + 1}
                  </span>

                  {other ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5">
                      <span className="truncate text-[13px] font-medium text-[var(--color-foreground)]">
                        Other
                      </span>
                      <span className="rounded-full bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                        Free text
                      </span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={option}
                      disabled={locked}
                      maxLength={80}
                      onChange={(event) => {
                        const next = [...options];
                        next[index] = event.target.value;
                        setOptions(next);
                      }}
                      className={cn(
                        "min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]",
                        "px-2.5 py-1.5 text-[13px] leading-snug text-[var(--color-foreground)] outline-none transition",
                        "placeholder:text-[var(--color-muted)]",
                        "focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                      )}
                      placeholder="Reason label"
                    />
                  )}

                  <div className="flex shrink-0 items-center">
                    <IconBtn
                      label="Remove"
                      danger
                      disabled={locked || other || !canRemoveMore}
                      onClick={() => {
                        setOptions(options.filter((_, i) => i !== index));
                      }}
                    >
                      <CloseRoundedIcon className="!text-[15px]" />
                    </IconBtn>
                  </div>
                </li>
              )}
            </AdminSortableItem>
          );
        })}
      </AdminSortableList>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={locked || options.length >= max}
          onClick={() => {
            const withoutOther = options.filter((item) => !isOther(item));
            setOptions([...withoutOther, "New reason", "Other"]);
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium transition",
            "text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]",
            "disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          <AddRoundedIcon className="!text-[15px]" />
          {addLabel}
        </button>
        <span className="text-[11px] tabular-nums text-[var(--color-muted)]">
          {options.length}/{max}
        </span>
      </div>

      {error ? (
        <p className="text-xs text-[var(--color-error)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
