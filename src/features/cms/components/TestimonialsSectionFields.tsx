"use client";

import TextField from "@mui/material/TextField";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { adminFieldGroup } from "@/features/admin/ui/admin-classes";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { patchItemAt } from "@/features/admin/ui/list-patch";
import {
  AdminDragHandle,
  AdminSortableItem,
  AdminSortableList,
  adminSortableIds,
  reorderBySortableIds,
} from "@/features/admin/ui/AdminSortable";
import type { SectionConfigMap } from "@/features/cms/schemas";
import { cn } from "@/lib/cn";

export type TestimonialEditableItem = {
  customerName: string;
  companyOrTitle: string;
  quote: string;
  rating: number | null;
  imagePath: string | null;
};

type Props = {
  title: string;
  items: TestimonialEditableItem[];
  onTitleChange: (title: string) => void;
  onChange: (items: TestimonialEditableItem[]) => void;
};

const MAX_ITEMS = 12;
const SORT_PREFIX = "quote";

const RATING_OPTIONS = [5, 4, 3, 2, 1].map((n) => ({
  value: String(n),
  label: `${n} ★`,
}));

export function mapTestimonialsConfigItems(
  items: SectionConfigMap["testimonials"]["items"] | undefined,
): TestimonialEditableItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((i) => ({
    customerName: String(i.customerName ?? ""),
    companyOrTitle: String(i.companyOrTitle ?? ""),
    quote: String(i.quote ?? ""),
    rating:
      typeof i.rating === "number" && i.rating >= 1 && i.rating <= 5
        ? i.rating
        : null,
    imagePath:
      typeof i.imagePath === "string" && i.imagePath.trim()
        ? i.imagePath
        : null,
  }));
}

export function TestimonialsSectionFields({
  title,
  items,
  onTitleChange,
  onChange,
}: Props) {
  function updateAt(index: number, patch: Partial<TestimonialEditableItem>) {
    const next = patchItemAt(items, index, patch);
    if (next) onChange(next);
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem() {
    if (items.length >= MAX_ITEMS) return;
    onChange([
      ...items,
      {
        customerName: "",
        companyOrTitle: "",
        quote: "",
        rating: 5,
        imagePath: null,
      },
    ]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">1. Heading</p>
        <p className="admin-field-group__hint">
          Shown above the quotes on the storefront. Watch the live preview.
        </p>
        <TextField
          label="Heading"
          fullWidth
          size="small"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. What customers say"
        />
      </div>

      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">2. Quotes</p>
        <p className="admin-field-group__hint">
          One card per customer. Up to {MAX_ITEMS}. Drag to reorder.
        </p>

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-xs text-[var(--color-muted)]">
            No quotes yet — add your first below.
          </p>
        ) : (
          <AdminSortableList
            ids={adminSortableIds(items.length, SORT_PREFIX)}
            className="space-y-2"
            onReorder={(activeId, overId) => {
              const next = reorderBySortableIds(
                items,
                activeId,
                overId,
                SORT_PREFIX,
              );
              if (next) onChange(next);
            }}
          >
            {items.map((item, index) => (
              <AdminSortableItem
                key={`${SORT_PREFIX}-${index}`}
                id={`${SORT_PREFIX}-${index}`}
              >
                {({ setNodeRef, style, isDragging, attributes, listeners }) => (
                  <li
                    ref={setNodeRef}
                    style={style}
                    className={cn(
                      "rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2",
                      isDragging && "z-10 opacity-90 shadow-md",
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <AdminDragHandle
                          attributes={attributes}
                          listeners={listeners}
                          className="!h-7 !w-7 !self-center rounded-md"
                        />
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[0.65rem] font-bold tabular-nums text-[var(--color-primary)]">
                          {index + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove quote ${index + 1}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => removeAt(index)}
                      >
                        <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                      </button>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <TextField
                        label="Name"
                        fullWidth
                        size="small"
                        value={item.customerName}
                        onChange={(e) =>
                          updateAt(index, { customerName: e.target.value })
                        }
                        placeholder="Priya S."
                      />
                      <TextField
                        label="Role / company"
                        fullWidth
                        size="small"
                        value={item.companyOrTitle}
                        onChange={(e) =>
                          updateAt(index, { companyOrTitle: e.target.value })
                        }
                        placeholder="Home cook"
                      />
                    </div>
                    <div className="mt-1.5 grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_6.5rem]">
                      <TextField
                        label="Quote"
                        fullWidth
                        size="small"
                        multiline
                        minRows={2}
                        maxRows={4}
                        value={item.quote}
                        onChange={(e) =>
                          updateAt(index, { quote: e.target.value })
                        }
                        placeholder="What they said about your store…"
                      />
                      <AdminSelect
                        label="Rating"
                        value={item.rating == null ? "" : String(item.rating)}
                        allowEmpty
                        emptyLabel="None"
                        options={RATING_OPTIONS}
                        onChange={(value) =>
                          updateAt(index, {
                            rating: value ? Number(value) : null,
                          })
                        }
                      />
                    </div>
                  </li>
                )}
              </AdminSortableItem>
            ))}
          </AdminSortableList>
        )}

        <button
          type="button"
          disabled={items.length >= MAX_ITEMS}
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] px-2.5 py-2 text-sm font-medium disabled:opacity-50 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          onClick={addItem}
        >
          <AddOutlinedIcon sx={{ fontSize: 17 }} />
          Add quote
        </button>
      </div>
    </div>
  );
}
