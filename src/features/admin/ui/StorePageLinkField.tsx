"use client";

import { AdminSelect } from "@/features/admin/ui/AdminSelect";

export const STORE_PAGE_OPTIONS = [
  { value: "/products", label: "Products" },
  { value: "/about", label: "About" },
  { value: "/blog", label: "Blog" },
  { value: "/contact", label: "Contact" },
  { value: "/privacy", label: "Privacy Policy" },
  { value: "/terms", label: "Terms of Use" },
  { value: "/disclaimer", label: "Disclaimer" },
  { value: "/", label: "Home" },
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

  const options = [
    ...(isCustom
      ? [{ value: resolved, label: `Custom path (${resolved})` }]
      : []),
    ...STORE_PAGE_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
    })),
  ];

  return (
    <AdminSelect
      label={label}
      value={resolved}
      disabled={disabled}
      error={error}
      helperText={helperText}
      allowEmpty={allowEmpty}
      emptyLabel={emptyLabel}
      options={options}
      onChange={(next) => {
        onChange(next ? next : null);
      }}
    />
  );
}
