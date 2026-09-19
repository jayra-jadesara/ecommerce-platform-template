"use client";

import TextField from "@mui/material/TextField";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ArrowDownwardOutlinedIcon from "@mui/icons-material/ArrowDownwardOutlined";
import ArrowUpwardOutlinedIcon from "@mui/icons-material/ArrowUpwardOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { adminFieldGroup } from "@/features/admin/ui/admin-classes";

export type StatisticEditableItem = {
  value: string;
  label: string;
};

type Props = {
  title: string;
  items: StatisticEditableItem[];
  onTitleChange: (title: string) => void;
  onChange: (items: StatisticEditableItem[]) => void;
};

const MAX_ITEMS = 8;

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-foreground)] disabled:opacity-35 hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]";

export function StatisticsSectionFields({
  title,
  items,
  onTitleChange,
  onChange,
}: Props) {
  function updateAt(index: number, patch: Partial<StatisticEditableItem>) {
    onChange(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    const tmp = copy[index]!;
    copy[index] = copy[next]!;
    copy[next] = tmp;
    onChange(copy);
  }

  function addItem() {
    if (items.length >= MAX_ITEMS) return;
    onChange([...items, { value: "", label: "" }]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">1. Heading</p>
        <p className="admin-field-group__hint">
          Shown above the numbers on the storefront.
        </p>
        <TextField
          label="Heading"
          fullWidth
          size="small"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Delivering values since 1999"
        />
      </div>

      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">2. Numbers</p>
        <p className="admin-field-group__hint">
          Each row is one stat — big number + short label. Up to {MAX_ITEMS}.
        </p>

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-xs text-[var(--color-muted)]">
            No stats yet — add your first number below.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={`stat-${index}`}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[0.65rem] font-bold tabular-nums text-[var(--color-primary)]">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      aria-label="Move up"
                      title="Move up"
                      className={iconBtn}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUpwardOutlinedIcon sx={{ fontSize: 15 }} />
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      aria-label="Move down"
                      title="Move down"
                      className={iconBtn}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownwardOutlinedIcon sx={{ fontSize: 15 }} />
                    </button>
                    <button
                      type="button"
                      aria-label="Remove statistic"
                      title="Remove"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => removeAt(index)}
                    >
                      <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                    </button>
                  </div>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                  <TextField
                    label="Number"
                    fullWidth
                    size="small"
                    value={item.value}
                    onChange={(e) => updateAt(index, { value: e.target.value })}
                    placeholder="24+"
                    helperText="Shown big"
                  />
                  <TextField
                    label="Label"
                    fullWidth
                    size="small"
                    value={item.label}
                    onChange={(e) => updateAt(index, { label: e.target.value })}
                    placeholder="Years of experience"
                    helperText="Shown under the number"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          disabled={items.length >= MAX_ITEMS}
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] px-2.5 py-2 text-sm font-medium disabled:opacity-50 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          onClick={addItem}
        >
          <AddOutlinedIcon sx={{ fontSize: 17 }} />
          Add number
        </button>
      </div>
    </div>
  );
}
