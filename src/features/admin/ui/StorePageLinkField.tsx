"use client";

import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { useStorefrontPathSelectOptions } from "@/features/seo/StorefrontPathsProvider";
import { normalizeStorefrontPath } from "@/features/seo/storefront-paths";

export function normalizePageValue(value: string, fallback = "/products"): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return normalizeStorefrontPath(trimmed);
}

export function pageOptionLabel(
  value: string,
  options?: Array<{ value: string; label: string }>,
): string {
  const found = options?.find((o) => o.value === value);
  return found?.label ?? value;
}

export function StorePageLinkField({
  label = "Opens this page",
  value,
  fallback = "/products",
  onChange,
  helperText,
  disabled,
  error,
  allowEmpty = false,
  emptyLabel = "No page selected",
  /** Override catalog — defaults to Google & SEO storefront paths from DB. */
  options: optionsProp,
}: {
  label?: string;
  value: string | null | undefined;
  fallback?: string;
  onChange: (value: string | null) => void;
  helperText?: string;
  disabled?: boolean;
  error?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  options?: Array<{ value: string; label: string }>;
}) {
  const contextOptions = useStorefrontPathSelectOptions();
  const catalog = optionsProp?.length ? optionsProp : contextOptions;

  const raw = String(value ?? "").trim();
  const resolved =
    allowEmpty && !raw ? "" : normalizePageValue(raw || fallback, fallback);
  const isCustom =
    Boolean(resolved) && !catalog.some((o) => o.value === resolved);

  const options = [
    ...(isCustom
      ? [{ value: resolved, label: `Custom path (${resolved})` }]
      : []),
    ...catalog,
  ];

  return (
    <AdminSelect
      label={label}
      value={resolved}
      disabled={disabled}
      error={error}
      helperText={
        helperText ??
        (catalog.length
          ? "Pages from Menu & Navigation"
          : "Add pages in Menu & Navigation first")
      }
      allowEmpty={allowEmpty}
      emptyLabel={emptyLabel}
      options={options}
      onChange={(next) => {
        onChange(next ? next : null);
      }}
    />
  );
}
