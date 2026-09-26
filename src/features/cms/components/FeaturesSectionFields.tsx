"use client";

import { useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { adminFieldGroup } from "@/features/admin/ui/admin-classes";
import {
  AdminDragHandle,
  AdminSortableItem,
  AdminSortableList,
  adminSortableIds,
  reorderBySortableIds,
} from "@/features/admin/ui/AdminSortable";
import { patchItemAt } from "@/features/admin/ui/list-patch";
import {
  FEATURE_ICON_IDS,
  type SectionConfigMap,
} from "@/features/cms/schemas";
import { cn } from "@/lib/cn";

export type FeatureEditableItem = {
  icon: (typeof FEATURE_ICON_IDS)[number];
  title: string;
  description: string;
};

type Props = {
  title: string;
  description: string;
  items: FeatureEditableItem[];
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onChange: (items: FeatureEditableItem[]) => void;
};

const MAX_ITEMS = 12;
const SORT_PREFIX = "feat";

const ICON_LABELS: Record<(typeof FEATURE_ICON_IDS)[number], string> = {
  star: "Star",
  shield: "Shield",
  truck: "Delivery truck",
  heart: "Heart",
  leaf: "Leaf / natural",
  check: "Check mark",
  globe: "Globe",
  clock: "Clock",
  package: "Package",
  support: "Support",
};

function normalizeIcon(
  value: string | undefined,
): (typeof FEATURE_ICON_IDS)[number] {
  if (
    value &&
    (FEATURE_ICON_IDS as readonly string[]).includes(value)
  ) {
    return value as (typeof FEATURE_ICON_IDS)[number];
  }
  return "star";
}

function mapExpandedAfterReorder(
  current: number | null,
  oldIndex: number,
  newIndex: number,
): number | null {
  if (current === null) return null;
  if (current === oldIndex) return newIndex;
  if (oldIndex < newIndex) {
    if (current > oldIndex && current <= newIndex) return current - 1;
  } else if (current >= newIndex && current < oldIndex) {
    return current + 1;
  }
  return current;
}

export function FeaturesSectionFields({
  title,
  description,
  items,
  onTitleChange,
  onDescriptionChange,
  onChange,
}: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(
    items.length > 0 ? 0 : null,
  );

  function updateAt(index: number, patch: Partial<FeatureEditableItem>) {
    const next = patchItemAt(items, index, patch);
    if (next) onChange(next);
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
    setOpenIndex((current) => {
      if (current === null) return null;
      if (items.length <= 1) return null;
      if (current === index) return Math.max(0, index - 1);
      if (current > index) return current - 1;
      return current;
    });
  }

  function addItem() {
    if (items.length >= MAX_ITEMS) return;
    const nextIndex = items.length;
    onChange([
      ...items,
      { icon: "star", title: "", description: "" },
    ]);
    setOpenIndex(nextIndex);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">1. Heading</p>
        <p className="admin-field-group__hint">
          Title and optional intro above the feature cards.
        </p>
        <TextField
          label="Heading"
          fullWidth
          size="small"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Why choose Sonet?"
        />
        <TextField
          label="Intro (optional)"
          fullWidth
          size="small"
          multiline
          minRows={2}
          maxRows={3}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="One short sentence under the heading."
        />
      </div>

      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">2. Feature cards</p>
        <p className="admin-field-group__hint">
          Open one at a time. Pick an icon, then add a title and short description.
          Drag the handle to reorder.
        </p>

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-xs text-[var(--color-muted)]">
            No features yet — add your first card below.
          </p>
        ) : (
          <AdminSortableList
            ids={adminSortableIds(items.length, SORT_PREFIX)}
            className="space-y-2"
            onReorder={(activeId, overId) => {
              const oldIndex = items.findIndex(
                (_, i) => `${SORT_PREFIX}-${i}` === activeId,
              );
              const newIndex = items.findIndex(
                (_, i) => `${SORT_PREFIX}-${i}` === overId,
              );
              const next = reorderBySortableIds(
                items,
                activeId,
                overId,
                SORT_PREFIX,
              );
              if (!next) return;
              onChange(next);
              setOpenIndex((current) =>
                mapExpandedAfterReorder(current, oldIndex, newIndex),
              );
            }}
          >
            {items.map((item, index) => {
              const open = openIndex === index;
              const summary =
                item.title.trim() ||
                (item.description.trim()
                  ? "Untitled feature"
                  : "Empty — add text");
              return (
                <AdminSortableItem
                  key={`${SORT_PREFIX}-${index}`}
                  id={`${SORT_PREFIX}-${index}`}
                >
                  {({ setNodeRef, style, isDragging, attributes, listeners }) => (
                    <li
                      ref={setNodeRef}
                      style={style}
                      className={cn(
                        "overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]",
                        open &&
                          "border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))]",
                        isDragging && "z-10 opacity-90 shadow-md",
                      )}
                    >
                      <div className="flex items-center gap-1.5 px-2 py-1.5">
                        <AdminDragHandle
                          attributes={attributes}
                          listeners={listeners}
                          className="!self-center rounded-md"
                        />
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-[color-mix(in_srgb,var(--color-foreground)_3%,transparent)]"
                          onClick={() =>
                            setOpenIndex((current) =>
                              current === index ? null : index,
                            )
                          }
                          aria-expanded={open}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[0.65rem] font-bold tabular-nums text-[var(--color-primary)]">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            <span className="mr-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                              {ICON_LABELS[normalizeIcon(item.icon)]}
                            </span>
                            {summary}
                          </span>
                          <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                            {open ? "Hide" : "Edit"}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label="Remove feature"
                          title="Remove"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => removeAt(index)}
                        >
                          <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                        </button>
                      </div>

                      {open ? (
                        <div
                          className="border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_55%,transparent)] px-2.5 py-2.5"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.55rem",
                          }}
                        >
                          <TextField
                            select
                            label="Icon"
                            fullWidth
                            size="small"
                            value={normalizeIcon(item.icon)}
                            onChange={(e) =>
                              updateAt(index, {
                                icon: normalizeIcon(e.target.value),
                              })
                            }
                          >
                            {FEATURE_ICON_IDS.map((id) => (
                              <MenuItem key={id} value={id}>
                                {ICON_LABELS[id]}
                              </MenuItem>
                            ))}
                          </TextField>
                          <TextField
                            label="Title"
                            fullWidth
                            size="small"
                            value={item.title}
                            onChange={(e) =>
                              updateAt(index, { title: e.target.value })
                            }
                            placeholder="e.g. Product range"
                          />
                          <TextField
                            label="Description"
                            fullWidth
                            size="small"
                            multiline
                            minRows={2}
                            maxRows={4}
                            value={item.description}
                            onChange={(e) =>
                              updateAt(index, { description: e.target.value })
                            }
                            placeholder="Short benefit for shoppers."
                          />
                        </div>
                      ) : null}
                    </li>
                  )}
                </AdminSortableItem>
              );
            })}
          </AdminSortableList>
        )}

        <button
          type="button"
          disabled={items.length >= MAX_ITEMS}
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] px-2.5 py-2 text-sm font-medium disabled:opacity-50 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          onClick={addItem}
        >
          <AddOutlinedIcon sx={{ fontSize: 17 }} />
          Add feature
        </button>
      </div>
    </div>
  );
}

export function mapFeaturesConfigItems(
  items: SectionConfigMap["features"]["items"] | undefined,
): FeatureEditableItem[] {
  return (
    items?.map((i) => ({
      icon: normalizeIcon(i.icon),
      title: String(i.title ?? ""),
      description: String(i.description ?? ""),
    })) ?? []
  );
}
