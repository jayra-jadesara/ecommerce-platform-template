"use client";

import { useState } from "react";
import TextField from "@mui/material/TextField";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { adminFieldGroup } from "@/features/admin/ui/admin-classes";
import {
  AdminDragHandle,
  AdminSortableItem,
  AdminSortableList,
  adminSortableIds,
  reorderBySortableIds,
} from "@/features/admin/ui/AdminSortable";
import { patchItemAt } from "@/features/admin/ui/list-patch";
import { cn } from "@/lib/cn";

export type FaqEditableItem = {
  question: string;
  answer: string;
  active: boolean;
};

type Props = {
  items: FaqEditableItem[];
  onChange: (items: FaqEditableItem[]) => void;
};

const MAX_ITEMS = 40;
const SORT_PREFIX = "faq";

const iconBtn =
  "inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-foreground)] disabled:opacity-35 hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]";

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

export function FaqSectionFields({ items, onChange }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(
    items.length > 0 ? 0 : null,
  );

  function updateAt(index: number, patch: Partial<FaqEditableItem>) {
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
    onChange([...items, { question: "", answer: "", active: true }]);
    setOpenIndex(nextIndex);
  }

  return (
    <div className={adminFieldGroup(true)}>
      <p className="admin-field-group__title">1. Questions &amp; answers</p>
      <p className="admin-field-group__hint">
        Open one at a time. Shoppers see an accordion — only one answer expands.
        Drag the handle to reorder.
      </p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-5 text-center text-xs text-[var(--color-muted)]">
          No FAQs yet — add your first question.
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
              item.question.trim() ||
              (item.answer.trim() ? "Untitled question" : "Empty — add text");
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
                      !item.active && "opacity-55",
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
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-foreground)]">
                          {summary}
                        </span>
                        <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                          {open ? "Hide" : "Edit"}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={iconBtn}
                        aria-label={item.active ? "Hide on store" : "Show on store"}
                        title={item.active ? "Visible" : "Hidden"}
                        onClick={() => updateAt(index, { active: !item.active })}
                      >
                        {item.active ? (
                          <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
                        ) : (
                          <VisibilityOffOutlinedIcon sx={{ fontSize: 15 }} />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="Remove FAQ"
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
                          label="Question"
                          fullWidth
                          size="small"
                          value={item.question}
                          onChange={(e) =>
                            updateAt(index, { question: e.target.value })
                          }
                          placeholder="e.g. Where do you source spices?"
                        />
                        <TextField
                          label="Answer"
                          fullWidth
                          size="small"
                          multiline
                          minRows={2}
                          maxRows={5}
                          value={item.answer}
                          onChange={(e) =>
                            updateAt(index, { answer: e.target.value })
                          }
                          placeholder="Short, clear answer for shoppers."
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
        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] px-2.5 py-2 text-sm font-medium text-[var(--color-foreground)] disabled:opacity-50 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        onClick={addItem}
      >
        <AddOutlinedIcon sx={{ fontSize: 17 }} />
        Add question
      </button>
    </div>
  );
}
