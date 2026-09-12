"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
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
import { LOGO_SIZE_OPTIONS } from "@/features/admin/settings/validation";
import {
  adminCard,
  adminCardPadding,
  adminCardsGrid,
  adminCardSpanFull,
  adminFieldGroup,
  adminFieldsGrid,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
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
import type { BrandConfig } from "@/types";

const LOGO_SIZE_LABELS: Record<(typeof LOGO_SIZE_OPTIONS)[number], string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

interface HeaderSettingsFormProps {
  initialValues: HeaderSettingsFormValues;
  brand: BrandConfig;
  canUpdate: boolean;
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
        initialValues.logoSize === "large"
          ? initialValues.logoSize
          : DEFAULT_HEADER_SETTINGS.logoSize,
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
    watched.logoSize === "large"
      ? watched.logoSize
      : "medium";

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
      className="w-full"
      style={adminStackStyle}
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

      <p className="text-sm text-[var(--color-muted)]">
        Control the top bar shoppers see on every page — logo size, menu, and
        optional announcement strip.
      </p>

      <div className={adminCardsGrid()}>
        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={adminStackStyle}
        >
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">1. What shows in the header</p>
          <p className="admin-field-group__hint">
            Turn features on or off. Most stores leave all of these on.
          </p>
            <div className={adminFieldsGrid(3)}>
              {(
                [
                  ["stickyHeader", "Stick to top while scrolling"],
                  ["searchEnabled", "Show search"],
                  ["cartEnabled", "Show cart"],
                  ["accountEnabled", "Show account / login"],
                  ["mobileMenuEnabled", "Show mobile menu"],
                  ["navVisible", "Show menu links"],
                ] as const
              ).map(([name, label]) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(field.value)}
                        onChange={(_, checked) => field.onChange(checked)}
                        disabled={!canUpdate || pending}
                      />
                    }
                    label={label}
                  />
                )}
              />
            ))}
          </div>
          <Controller
            name="logoSize"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Logo size"
                fullWidth
                required
                disabled={!canUpdate || pending}
                value={logoSize}
                onChange={(event) => field.onChange(event.target.value)}
                onBlur={field.onBlur}
                name={field.name}
                inputRef={field.ref}
                helperText="How large your logo appears in the header"
              >
                {LOGO_SIZE_OPTIONS.map((size) => (
                  <MenuItem key={size} value={size}>
                    {LOGO_SIZE_LABELS[size]}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={adminStackStyle}
        >
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">2. Announcement bar</p>
          <p className="admin-field-group__hint">
            Optional strip above the header for offers or short news.
          </p>
          <Controller
            name="announcementEnabled"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(field.value)}
                    onChange={(_, checked) => field.onChange(checked)}
                    disabled={!canUpdate || pending}
                  />
                }
                label={
                  announcementOn
                    ? "Yes — show announcement bar"
                    : "No — hide announcement bar"
                }
              />
            )}
          />

          {announcementOn ? (
            <>
              <Controller
                name="announcementText"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label="Message shoppers see"
                    fullWidth
                    multiline
                    minRows={2}
                    disabled={!canUpdate || pending}
                    placeholder="Example: Free shipping on orders over ₹500"
                    helperText="Keep it short — one line works best"
                  />
                )}
              />
              <Controller
                name="announcementUrl"
                control={control}
                render={({ field, fieldState }) => (
                  <div>
                    <StorePageLinkField
                      label="Opens this page when clicked"
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
                          : "Pick a store page — no need to type a URL"
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
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(field.value)}
                        onChange={(_, checked) => field.onChange(checked)}
                        disabled={!canUpdate || pending}
                      />
                    }
                    label="Open link in a new browser tab"
                  />
                )}
              />
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
              Announcement bar is off. Turn it on to show a message above the
              header.
            </p>
          )}
        </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()} ${adminCardSpanFull()}`}
        >
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          Header preview
        </h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Rough look of the top of your store.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border)]">
          {previewAnnouncement ? (
            <div className="bg-[var(--color-button-background)] px-3 py-2 text-center text-sm text-[var(--color-button-foreground)]">
              {previewAnnouncement}
              {watched.announcementUrl?.trim() ? (
                <span className="mt-1 block text-xs opacity-80">
                  Links to {pageOptionLabel(watched.announcementUrl.trim())}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="flex items-center justify-between bg-[var(--color-header-background)] px-4 py-3 text-[var(--color-header-foreground)]">
            <span
              className="font-semibold"
              style={{
                fontSize:
                  logoSize === "small"
                    ? "0.95rem"
                    : logoSize === "large"
                      ? "1.35rem"
                      : "1.1rem",
              }}
            >
              {brand.name}
            </span>
            <span className="text-xs text-[var(--color-muted)]">
              {[
                watched.navVisible ? "Menu" : null,
                watched.searchEnabled ? "Search" : null,
                watched.cartEnabled ? "Cart" : null,
                watched.accountEnabled ? "Account" : null,
                watched.stickyHeader ? "Sticky" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Minimal header"}
            </span>
          </div>
        </div>
        </section>
      </div>
    </form>
  );
}
