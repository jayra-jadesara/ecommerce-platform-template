"use client";

import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { adminFieldGroup } from "@/features/admin/ui/admin-classes";
import { AdminMultiSelect } from "@/features/admin/ui/AdminMultiSelect";
import type { CatalogPickerOption } from "@/features/cms/components/ProductsSectionFields";

type Props = {
  title: string;
  description: string;
  categoryIds: string[];
  columns: 2 | 3 | 4;
  categoryOptions: CatalogPickerOption[];
  onChange: (patch: {
    title?: string;
    description?: string;
    categoryIds?: string[];
    columns?: 2 | 3 | 4;
  }) => void;
};

export function CategoriesSectionFields({
  title,
  description,
  categoryIds,
  columns,
  categoryOptions,
  onChange,
}: Props) {
  const showingAll = categoryIds.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">1. Heading</p>
        <p className="admin-field-group__hint">
          Title and short intro above the category cards.
        </p>
        <TextField
          label="Heading"
          fullWidth
          size="small"
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Our products"
        />
        <TextField
          label="Description (optional)"
          fullWidth
          size="small"
          multiline
          minRows={2}
          maxRows={3}
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="One short sentence for shoppers."
        />
      </div>

      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">2. Which categories</p>
        <p className="admin-field-group__hint">
          {showingAll
            ? "Leave empty to show all active categories automatically."
            : `${categoryIds.length} selected — order follows your picks.`}
        </p>

        {categoryOptions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-muted)]">
            No categories yet. Add some under Catalog → Categories first.
          </p>
        ) : (
          <AdminMultiSelect
            label="Categories"
            options={categoryOptions}
            value={categoryIds}
            onChange={(ids) => onChange({ categoryIds: ids.slice(0, 24) })}
            placeholder="Search categories… (empty = show all)"
            helperText="Pick specific ones, or clear all to show every active category."
            limitTags={3}
          />
        )}

        <TextField
          select
          label="Columns"
          fullWidth
          size="small"
          value={columns}
          onChange={(e) =>
            onChange({ columns: Number(e.target.value) as 2 | 3 | 4 })
          }
          helperText="How many cards across on desktop."
        >
          <MenuItem value={2}>2 columns</MenuItem>
          <MenuItem value={3}>3 columns</MenuItem>
          <MenuItem value={4}>4 columns</MenuItem>
        </TextField>
      </div>
    </div>
  );
}
