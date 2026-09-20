"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { saveHeaderSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  DEFAULT_HEADER_SETTINGS,
  headerSettingsSchema,
  type HeaderSettingsFormValues,
} from "@/features/admin/settings/schemas";
import { LOGO_HANG_OPTIONS, LOGO_SIZE_OPTIONS } from "@/features/admin/settings/validation";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { adminCard } from "@/features/admin/ui/admin-classes";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import {
  pageOptionLabel,
  StorePageLinkField,
} from "@/features/admin/ui/StorePageLinkField";
import { cn } from "@/lib/cn";
import type { BrandConfig } from "@/types";

const LOGO_SIZE_LABELS: Record<(typeof LOGO_SIZE_OPTIONS)[number], string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "Extra large",
};

const LOGO_HANG_LABELS: Record<(typeof LOGO_HANG_OPTIONS)[number], string> = {
  none: "None — stays in the bar",
  soft: "Soft — slight hang over hero",
  medium: "Medium — clear hang over hero",
  bold: "Bold — deep hang over hero",
};

const FEATURE_ROWS: Array<{
  name:
    | "stickyHeader"
    | "searchEnabled"
    | "cartEnabled"
    | "accountEnabled"
    | "mobileMenuEnabled"
    | "navVisible";
  label: string;
  hint: string;
}> = [
  {
    name: "stickyHeader",
    label: "Stick while scrolling",
    hint: "Keeps the top bar on screen as shoppers scroll down.",
  },
  {
    name: "navVisible",
    label: "Show menu links",
    hint: "Home, Products, About, and other pages in the center.",
  },
  {
    name: "searchEnabled",
    label: "Show search",
    hint: "Search icon so shoppers can find products quickly.",
  },
  {
    name: "cartEnabled",
    label: "Show cart",
    hint: "Bag / cart icon with item count.",
  },
  {
    name: "accountEnabled",
    label: "Show account",
    hint: "Login / account menu and wishlist shortcut.",
  },
  {
    name: "mobileMenuEnabled",
    label: "Show mobile menu",
    hint: "Hamburger menu on phones and tablets.",
  },
];

interface HeaderSettingsFormProps {
  initialValues: HeaderSettingsFormValues;
  brand: BrandConfig;
  canUpdate: boolean;
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-2.5">
      <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
        {title}
      </h2>
      <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-muted)]">
        {subtitle}
      </p>
    </div>
  );
}

export function HeaderSettingsForm({
  initialValues,
  brand,
  canUpdate,
}: HeaderSettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const defaults = useMemo(
    () => ({
      ...DEFAULT_HEADER_SETTINGS,
      ...initialValues,
      logoSize:
        initialValues.logoSize === "small" ||
        initialValues.logoSize === "medium" ||
        initialValues.logoSize === "large" ||
        initialValues.logoSize === "xlarge"
          ? initialValues.logoSize
          : DEFAULT_HEADER_SETTINGS.logoSize,
      logoHang:
        initialValues.logoHang === "none" ||
        initialValues.logoHang === "soft" ||
        initialValues.logoHang === "medium" ||
        initialValues.logoHang === "bold"
          ? initialValues.logoHang
          : DEFAULT_HEADER_SETTINGS.logoHang,
    }),
    [initialValues],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFieldError,
    setFocus,
    formState: { isDirty },
  } = useForm<HeaderSettingsFormValues>({
    resolver: zodResolver(headerSettingsSchema),
    defaultValues: defaults,
  });

  const watched = useWatch({ control });
  const announcementOn = Boolean(watched.announcementEnabled);
  const logoSize =
    watched.logoSize === "small" ||
    watched.logoSize === "medium" ||
    watched.logoSize === "large" ||
    watched.logoSize === "xlarge"
      ? watched.logoSize
      : "medium";
  const logoHang =
    watched.logoHang === "none" ||
    watched.logoHang === "soft" ||
    watched.logoHang === "medium" ||
    watched.logoHang === "bold"
      ? watched.logoHang
      : "none";
  const hangPreview = logoHang !== "none";

  const previewAnnouncement = useMemo(() => {
    if (!announcementOn || !watched.announcementText?.trim()) return null;
    return watched.announcementText.trim();
  }, [announcementOn, watched.announcementText]);

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveHeaderSettingsAction(values);
      if (!result.ok) {
        const serverFieldErrors = resultFieldErrors(result);
        if (serverFieldErrors) {
          applyServerFieldErrors(setFieldError as never, serverFieldErrors);
          focusFirstFieldError({
            fieldErrors: serverFieldErrors,
            setFocus: setFocus as (name: string) => void,
          });
        }
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      reset(values);
      router.refresh();
    });
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="w-full space-y-3"
      noValidate
    >
      <SettingsFormToolbar
        isDirty={isDirty}
        canUpdate={canUpdate}
        pending={pending}
        error={error}
        success={success}
        onSave={onSubmit}
        onCancel={() => {
          reset(defaults);
          setError(null);
          setSuccess(null);
        }}
        onResetDefaults={() => {
          reset(DEFAULT_HEADER_SETTINGS);
          setSuccess(null);
        }}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,21rem)] lg:items-start">
        <div className="space-y-3">
          <section className={cn(adminCard(), "p-3.5 sm:p-4")}>
            <SectionTitle
              title="What shoppers see"
              subtitle="Each switch turns a part of the store header on or off."
            />
            <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)]">
              {FEATURE_ROWS.map((row) => (
                <Controller
                  key={row.name}
                  name={row.name}
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      label={row.label}
                      description={row.hint}
                      variant="row"
                      className="!rounded-none !border-0 !bg-transparent !px-3 !py-2.5"
                    />
                  )}
                />
              ))}
            </div>

            <div className="mt-3">
              <Controller
                name="productsCategoryMenu"
                control={control}
                render={({ field }) => (
                  <AdminToggle
                    checked={Boolean(field.value)}
                    onChange={field.onChange}
                    disabled={!canUpdate || pending}
                    label="Categories under Products"
                    description={
                      field.value
                        ? "On — Products opens a menu of your store categories (plus All products)."
                        : "Off — Products is a normal link to the full catalog. Default."
                    }
                    variant="row"
                    className="!border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] !bg-[color-mix(in_srgb,var(--color-primary)_5%,var(--color-surface))]"
                  />
                )}
              />
            </div>
          </section>

          <section className={cn(adminCard(), "p-3.5 sm:p-4")}>
            <SectionTitle
              title="Logo"
              subtitle="Controls the mark in the top-left of every store page."
            />
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Controller
                name="logoSize"
                control={control}
                render={({ field }) => (
                  <AdminSelect
                    label="Logo size"
                    required
                    disabled={!canUpdate || pending}
                    value={logoSize}
                    onChange={field.onChange}
                    name={field.name}
                    helperText="How tall the logo is inside the header."
                    options={LOGO_SIZE_OPTIONS.map((size) => ({
                      value: size,
                      label: LOGO_SIZE_LABELS[size],
                    }))}
                  />
                )}
              />
              <Controller
                name="logoHang"
                control={control}
                render={({ field }) => (
                  <AdminSelect
                    label="Overlap onto hero"
                    required
                    disabled={!canUpdate || pending}
                    value={logoHang}
                    onChange={field.onChange}
                    name={field.name}
                    helperText="Hang over the hero image; snaps back on scroll."
                    options={LOGO_HANG_OPTIONS.map((hang) => ({
                      value: hang,
                      label: LOGO_HANG_LABELS[hang],
                    }))}
                  />
                )}
              />
            </div>
          </section>

          <section className={cn(adminCard(), "p-3.5 sm:p-4")}>
            <SectionTitle
              title="Announcement bar"
              subtitle="Thin strip above the header for a short offer or notice."
            />
            <Controller
              name="announcementEnabled"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!canUpdate || pending}
                  label={
                    announcementOn
                      ? "Announcement bar is on"
                      : "Announcement bar is off"
                  }
                  description={
                    announcementOn
                      ? "Shoppers see your message above the logo bar."
                      : "Turn on to show a one-line message site-wide."
                  }
                  variant="row"
                  className="!py-2"
                />
              )}
            />

            {announcementOn ? (
              <div className="mt-3 space-y-3">
                <Controller
                  name="announcementText"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value ?? ""}
                      size="small"
                      label="Message"
                      fullWidth
                      disabled={!canUpdate || pending}
                      placeholder="e.g. Free shipping on orders over ₹500"
                      helperText="One short line works best."
                    />
                  )}
                />
                <Controller
                  name="announcementUrl"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="pt-0.5">
                      <StorePageLinkField
                        label="Link when clicked"
                        value={field.value}
                        fallback="/"
                        allowEmpty
                        emptyLabel="No link (text only)"
                        disabled={!canUpdate || pending}
                        error={Boolean(fieldState.error)}
                        onChange={(value) => field.onChange(value ?? "")}
                        helperText={
                          fieldState.error
                            ? undefined
                            : "Choose a store page, or leave empty for text only."
                        }
                      />
                      <FieldError message={fieldState.error?.message} />
                    </div>
                  )}
                />
                <Controller
                  name="announcementOpenInNewTab"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      label="Open link in a new tab"
                      description="Only applies when a link is set above."
                      variant="row"
                      className="!py-2"
                    />
                  )}
                />
              </div>
            ) : null}
          </section>
        </div>

        <aside className={cn(adminCard(), "p-3.5 sm:p-4 lg:sticky lg:top-16")}>
          <SectionTitle
            title="Live preview"
            subtitle="Rough mock of what shoppers see at the top."
          />

          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] shadow-[0_8px_24px_color-mix(in_srgb,var(--color-foreground)_6%,transparent)]">
            {previewAnnouncement ? (
              <div className="bg-[var(--color-button-background)] px-2.5 py-1.5 text-center text-[10px] leading-snug text-[var(--color-button-foreground)]">
                {previewAnnouncement}
                {watched.announcementUrl?.trim() ? (
                  <span className="mt-0.5 block text-[9px] opacity-80">
                    Opens {pageOptionLabel(watched.announcementUrl.trim())}
                    {watched.announcementOpenInNewTab ? " (new tab)" : ""}
                  </span>
                ) : (
                  <span className="mt-0.5 block text-[9px] opacity-80">
                    Text only — no link
                  </span>
                )}
              </div>
            ) : (
              <div className="border-b border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-center text-[9px] text-[var(--color-muted)]">
                No announcement bar
              </div>
            )}

            <div className="relative bg-[var(--color-header-background)] px-3 py-2.5 text-[var(--color-header-foreground)]">
              <div className="flex items-center justify-between gap-2">
                <div
                  className={cn(
                    "relative z-[2] flex shrink-0 items-end",
                    logoHang === "soft" && "-mb-3",
                    logoHang === "medium" && "-mb-5",
                    logoHang === "bold" && "-mb-7",
                  )}
                >
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.logoUrl}
                      alt=""
                      className="w-auto object-contain object-left"
                      style={{
                        height:
                          logoSize === "small"
                            ? "1.25rem"
                            : logoSize === "medium"
                              ? "1.6rem"
                              : logoSize === "large"
                                ? "2.1rem"
                                : "2.5rem",
                      }}
                    />
                  ) : (
                    <span className="text-xs font-semibold tracking-tight">
                      {brand.name}
                    </span>
                  )}
                </div>

                {watched.navVisible ? (
                  <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 truncate text-[9px] font-medium text-[var(--color-muted)] sm:flex">
                    <span>Home</span>
                    <span className="text-[var(--color-primary)]">
                      Products{watched.productsCategoryMenu ? " ▾" : ""}
                    </span>
                    <span>About</span>
                  </div>
                ) : (
                  <span className="flex-1 text-center text-[9px] text-[var(--color-muted)]">
                    Menu hidden
                  </span>
                )}

                <div className="relative z-[1] flex shrink-0 items-center gap-1 text-[9px] text-[var(--color-muted)]">
                  {watched.searchEnabled ? <span>Search</span> : null}
                  {watched.accountEnabled ? <span>Account</span> : null}
                  {watched.cartEnabled ? <span>Cart</span> : null}
                  {!watched.searchEnabled &&
                  !watched.accountEnabled &&
                  !watched.cartEnabled ? (
                    <span>—</span>
                  ) : null}
                </div>
              </div>
            </div>

            {hangPreview ? (
              <div
                className="flex h-9 items-end bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface))] px-3 pb-1.5"
                aria-hidden
              >
                <span className="text-[9px] text-[var(--color-muted)]">
                  Hero area (logo overlaps here)
                </span>
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] px-3 py-1.5 text-[9px] text-[var(--color-muted)]">
                Page content starts below the header
              </div>
            )}
          </div>

          <ul className="mt-3 space-y-1 text-[11px] leading-snug text-[var(--color-muted)]">
            <li>
              <span className="font-medium text-[var(--color-foreground)]">
                Sticky:
              </span>{" "}
              {watched.stickyHeader ? "stays on scroll" : "scrolls away"}
            </li>
            <li>
              <span className="font-medium text-[var(--color-foreground)]">
                Products:
              </span>{" "}
              {watched.productsCategoryMenu
                ? "category dropdown"
                : "simple catalog link"}
            </li>
            <li>
              <span className="font-medium text-[var(--color-foreground)]">
                Mobile menu:
              </span>{" "}
              {watched.mobileMenuEnabled ? "shown on small screens" : "hidden"}
            </li>
          </ul>
        </aside>
      </div>
    </form>
  );
}
