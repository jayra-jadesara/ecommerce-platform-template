"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { saveSeoSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  DEFAULT_SEO_SETTINGS,
  seoSettingsSchema,
  type SeoSettingsFormValues,
} from "@/features/admin/settings/schemas";

interface SeoSettingsFormProps {
  initialValues: SeoSettingsFormValues;
  canUpdate: boolean;
}

export function SeoSettingsForm({
  initialValues,
  canUpdate,
}: SeoSettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<SeoSettingsFormValues>({
    resolver: zodResolver(seoSettingsSchema),
    defaultValues: initialValues,
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveSeoSettingsAction(values);
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
          reset(DEFAULT_SEO_SETTINGS);
          setSuccess(null);
        }}
      />

      <section className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:grid-cols-2">
        <Controller
          name="siteTitle"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Site title"
              fullWidth
              required
              disabled={!canUpdate}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="canonicalUrl"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Canonical URL"
              fullWidth
              disabled={!canUpdate}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <div className="md:col-span-2">
          <Controller
            name="metaDescription"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Meta description"
                fullWidth
                multiline
                minRows={3}
                disabled={!canUpdate}
              />
            )}
          />
        </div>
        <div className="md:col-span-2">
          <Controller
            name="keywords"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Keywords"
                fullWidth
                disabled={!canUpdate}
                helperText="Comma-separated keywords"
              />
            )}
          />
        </div>
        <Controller
          name="ogTitle"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Open Graph title"
              fullWidth
              disabled={!canUpdate}
            />
          )}
        />
        <Controller
          name="ogDescription"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Open Graph description"
              fullWidth
              disabled={!canUpdate}
            />
          )}
        />
        <Controller
          name="robotsIndex"
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
              label="Allow search indexing"
            />
          )}
        />
        <Controller
          name="robotsFollow"
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
              label="Allow following links"
            />
          )}
        />
      </section>
    </form>
  );
}
