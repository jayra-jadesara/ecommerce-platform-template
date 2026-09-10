"use client";

import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

export const STORE_PAGE_OPTIONS = [
  { value: "/products", label: "Products catalog" },
  { value: "/about", label: "About page" },
  { value: "/contact", label: "Contact page" },
  { value: "/", label: "Home page" },
  { value: "/cart", label: "Cart" },
] as const;

export function normalizePageValue(value: string, fallback = "/products"): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const allowed = STORE_PAGE_OPTIONS.map((o) => o.value as string);
  if (allowed.includes(trimmed)) return trimmed;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  return fallback;
}

export function pageOptionLabel(value: string): string {
  const found = STORE_PAGE_OPTIONS.find((o) => o.value === value);
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
}) {
  const raw = String(value ?? "").trim();
  const resolved =
    allowEmpty && !raw ? "" : normalizePageValue(raw || fallback, fallback);
  const isCustom =
    Boolean(resolved) &&
    !STORE_PAGE_OPTIONS.some((o) => o.value === resolved);

  return (
    <TextField
      select
      label={label}
      fullWidth
      disabled={disabled}
      error={error}
      value={resolved}
      onChange={(e) => {
        const next = e.target.value;
        onChange(next ? next : null);
      }}
      helperText={helperText}
    >
      {allowEmpty ? <MenuItem value="">{emptyLabel}</MenuItem> : null}
      {isCustom ? (
        <MenuItem value={resolved}>Custom path ({resolved})</MenuItem>
      ) : null}
      {STORE_PAGE_OPTIONS.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label} ({opt.value})
        </MenuItem>
      ))}
    </TextField>
  );
}
