"use client";

import TextField from "@mui/material/TextField";
import { adminFieldGroup } from "@/features/admin/ui/admin-classes";
import { AdminMultiSelect } from "@/features/admin/ui/AdminMultiSelect";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";

export type CatalogPickerOption = {
  id: string;
  label: string;
};

export type ProductsSectionSource =
  | "FEATURED_PRODUCTS"
  | "LATEST_PRODUCTS"
  | "CATEGORY_PRODUCTS"
  | "SELECTED_PRODUCTS";

type Props = {
  title: string;
  description: string;
  source: ProductsSectionSource;
  limit: number;
  categoryId: string | null;
  productIds: string[];
  categoryOptions: CatalogPickerOption[];
  productOptions: CatalogPickerOption[];
  onChange: (patch: {
    title?: string;
    description?: string;
    source?: ProductsSectionSource;
    limit?: number;
    categoryId?: string | null;
    productIds?: string[];
  }) => void;
};

const SOURCE_OPTIONS = [
  {
    value: "FEATURED_PRODUCTS",
    label: "Featured products",
    hint: "Products marked Featured in Catalog → Products.",
  },
  {
    value: "LATEST_PRODUCTS",
    label: "Latest products",
    hint: "Newest products in your catalog.",
  },
  {
    value: "CATEGORY_PRODUCTS",
    label: "One category",
    hint: "Pick a category — its products appear in the grid.",
  },
  {
    value: "SELECTED_PRODUCTS",
    label: "Hand-picked products",
    hint: "Choose exactly which products to show.",
  },
] as const;

export function ProductsSectionFields({
  title,
  description,
  source,
  limit,
  categoryId,
  productIds,
  categoryOptions,
  productOptions,
  onChange,
}: Props) {
  const sourceMeta =
    SOURCE_OPTIONS.find((o) => o.value === source) ?? SOURCE_OPTIONS[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div className={adminFieldGroup(true)}>
        <p className="admin-field-group__title">1. Heading</p>
        <p className="admin-field-group__hint">
          Title and short intro above the product grid.
        </p>
        <TextField
          label="Heading"
          fullWidth
          size="small"
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Featured masalas"
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
        <p className="admin-field-group__title">2. Which products</p>
        <p className="admin-field-group__hint">{sourceMeta.hint}</p>
        <AdminSelect
          label="Product source"
          value={source}
          options={SOURCE_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          onChange={(value) =>
            onChange({ source: value as ProductsSectionSource })
          }
        />

        {source === "CATEGORY_PRODUCTS" ? (
          categoryOptions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-muted)]">
              No categories yet. Add some under Catalog → Categories first.
            </p>
          ) : (
            <AdminSelect
              label="Category"
              value={categoryId ?? ""}
              allowEmpty
              emptyLabel="Select a category"
              options={categoryOptions.map((c) => ({
                value: c.id,
                label: c.label,
              }))}
              onChange={(value) =>
                onChange({ categoryId: value.trim() ? value : null })
              }
              helperText="Products from this category show on the storefront."
            />
          )
        ) : null}

        {source === "SELECTED_PRODUCTS" ? (
          productOptions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-muted)]">
              No active products yet. Add some under Catalog → Products first.
            </p>
          ) : (
            <AdminMultiSelect
              label="Products"
              options={productOptions}
              value={productIds}
              onChange={(ids) => onChange({ productIds: ids.slice(0, 24) })}
              placeholder="Search and pick products…"
              helperText="Order follows your selection. Max 24."
              limitTags={2}
            />
          )
        ) : null}

        <TextField
          label="How many to show"
          type="number"
          fullWidth
          size="small"
          value={limit}
          onChange={(e) =>
            onChange({
              limit: Math.min(24, Math.max(1, Number(e.target.value) || 8)),
            })
          }
          slotProps={{ htmlInput: { min: 1, max: 24 } }}
          helperText="1–24 products on the storefront."
        />
      </div>
    </div>
  );
}
