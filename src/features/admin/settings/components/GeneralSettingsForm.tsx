"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { saveGeneralSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  DEFAULT_GENERAL_SETTINGS,
  generalSettingsSchema,
  type GeneralSettingsFormValues,
} from "@/features/admin/settings/schemas";

interface GeneralSettingsFormProps {
  initialValues: GeneralSettingsFormValues;
  canUpdate: boolean;
}

export function GeneralSettingsForm({
  initialValues,
  canUpdate,
}: GeneralSettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: initialValues,
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveGeneralSettingsAction(values);
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
          reset(DEFAULT_GENERAL_SETTINGS);
          setSuccess(null);
        }}
      />

      <section className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-semibold">Store identity</h2>
        <Controller
          name="displayName"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Display name"
              fullWidth
              disabled={!canUpdate}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="legalName"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Legal name"
              fullWidth
              disabled={!canUpdate}
            />
          )}
        />
        <Controller
          name="currency"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Currency (ISO)"
              fullWidth
              disabled={!canUpdate}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="timezone"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Timezone"
              fullWidth
              disabled={!canUpdate}
            />
          )}
        />
        <Controller
          name="defaultLocale"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Default locale"
              fullWidth
              disabled={!canUpdate}
            />
          )}
        />
      </section>

      <section className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-semibold">Contact</h2>
        {(
          [
            ["contactEmail", "Contact email"],
            ["contactPhone", "Phone"],
            ["contactPhoneSecondary", "Secondary phone"],
            ["addressLine1", "Address line 1"],
            ["addressLine2", "Address line 2"],
            ["city", "City"],
            ["state", "State"],
            ["postalCode", "Postal code"],
            ["country", "Country"],
          ] as const
        ).map(([name, label]) => (
          <Controller
            key={name}
            name={name}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={label}
                fullWidth
                disabled={!canUpdate}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
        ))}
      </section>

      <section className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-semibold">Business & checkout</h2>
        <Controller
          name="businessRegistrationNumber"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Business registration number"
              fullWidth
              disabled={!canUpdate}
            />
          )}
        />
        <Controller
          name="taxId"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Tax ID"
              fullWidth
              disabled={!canUpdate}
            />
          )}
        />
        <Controller
          name="registrationEnabled"
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
              label="Customer registration enabled"
            />
          )}
        />
        <Controller
          name="checkoutGuestAllowed"
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
              label="Guest checkout allowed (placeholder)"
            />
          )}
        />
      </section>

      <section className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-semibold">Social links</h2>
        {(
          [
            ["socialInstagram", "Instagram URL"],
            ["socialFacebook", "Facebook URL"],
            ["socialYoutube", "YouTube URL"],
            ["socialLinkedin", "LinkedIn URL"],
            ["socialX", "X URL"],
            ["socialWhatsapp", "WhatsApp URL"],
          ] as const
        ).map(([name, label]) => (
          <Controller
            key={name}
            name={name}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={label}
                fullWidth
                disabled={!canUpdate}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
        ))}
      </section>
    </form>
  );
}
