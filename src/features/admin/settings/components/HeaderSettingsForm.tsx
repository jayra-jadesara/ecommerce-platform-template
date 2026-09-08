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
import type { BrandConfig } from "@/types";

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

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<HeaderSettingsFormValues>({
    resolver: zodResolver(headerSettingsSchema),
    defaultValues: initialValues,
  });

  const watched = useWatch({ control });

  const previewAnnouncement = useMemo(() => {
    if (!watched.announcementEnabled || !watched.announcementText?.trim()) {
      return null;
    }
    return watched.announcementText;
  }, [watched.announcementEnabled, watched.announcementText]);

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveHeaderSettingsAction(values);
      if (!result.ok) {
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
      className="space-y-6"
    >
      <SettingsFormToolbar
        isDirty={isDirty}
        canUpdate={canUpdate}
        pending={pending}
        error={error}
        success={success}
        onSave={onSubmit}
        onCancel={() => {
          reset(initialValues);
          setError(null);
          setSuccess(null);
        }}
        onResetDefaults={() => {
          reset(DEFAULT_HEADER_SETTINGS);
          setSuccess(null);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="font-semibold">Header behavior</h2>
          {(
            [
              ["stickyHeader", "Sticky header"],
              ["searchEnabled", "Search enabled"],
              ["cartEnabled", "Cart enabled"],
              ["accountEnabled", "Account / login enabled"],
              ["mobileMenuEnabled", "Mobile menu enabled"],
              ["navVisible", "Navigation visible"],
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
                      checked={field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                      disabled={!canUpdate}
                    />
                  }
                  label={label}
                />
              )}
            />
          ))}
          <Controller
            name="logoSize"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Logo size"
                fullWidth
                required
                disabled={!canUpdate}
              >
                {LOGO_SIZE_OPTIONS.map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </section>

        <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="font-semibold">Announcement bar</h2>
          <Controller
            name="announcementEnabled"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(_, checked) => field.onChange(checked)}
                    disabled={!canUpdate}
                  />
                }
                label="Enabled"
              />
            )}
          />
          <Controller
            name="announcementText"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Announcement text"
                fullWidth
                multiline
                minRows={2}
                disabled={!canUpdate}
              />
            )}
          />
          <Controller
            name="announcementUrl"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Announcement link"
                fullWidth
                disabled={!canUpdate}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="announcementOpenInNewTab"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(_, checked) => field.onChange(checked)}
                    disabled={!canUpdate}
                  />
                }
                label="Open link in new tab"
              />
            )}
          />
        </section>
      </div>

      <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="mb-3 text-sm font-semibold">Header preview</p>
        {previewAnnouncement ? (
          <div className="mb-2 rounded-md bg-[var(--color-button-background)] px-3 py-2 text-center text-sm text-[var(--color-button-foreground)]">
            {previewAnnouncement}
          </div>
        ) : null}
        <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-header-background)] px-4 py-3 text-[var(--color-header-foreground)]">
          <span className="font-semibold">{brand.name}</span>
          <span className="text-xs text-[var(--color-muted)]">
            {watched.navVisible ? "Nav on" : "Nav hidden"} ·{" "}
            {watched.stickyHeader ? "Sticky" : "Static"} · Logo{" "}
            {watched.logoSize}
          </span>
        </div>
      </aside>
    </form>
  );
}
