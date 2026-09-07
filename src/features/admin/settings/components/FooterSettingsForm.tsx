"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { saveFooterSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  DEFAULT_FOOTER_SETTINGS,
  footerSettingsSchema,
  type FooterSettingsFormValues,
} from "@/features/admin/settings/schemas";
import type { BrandConfig } from "@/types";

interface FooterSettingsFormProps {
  initialValues: FooterSettingsFormValues;
  brand: BrandConfig;
  canUpdate: boolean;
}

export function FooterSettingsForm({
  initialValues,
  brand,
  canUpdate,
}: FooterSettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FooterSettingsFormValues>({
    resolver: zodResolver(footerSettingsSchema),
    defaultValues: initialValues,
  });

  const watched = useWatch({ control });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveFooterSettingsAction(values);
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
          reset(DEFAULT_FOOTER_SETTINGS);
          setSuccess(null);
        }}
      />

      <section className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:grid-cols-2">
        {(
          [
            ["enabled", "Footer enabled"],
            ["showContact", "Show contact information"],
            ["showSocial", "Show social links"],
            ["showNewsletter", "Show newsletter placeholder"],
            ["navVisible", "Show footer navigation"],
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
        <div className="md:col-span-2">
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Footer description"
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
            name="copyrightText"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Copyright text"
                fullWidth
                disabled={!canUpdate}
                helperText="Leave blank to use the default year + brand name."
              />
            )}
          />
        </div>
      </section>

      <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-footer-background)] p-4 text-[var(--color-footer-foreground)]">
        <p className="text-sm font-semibold">Footer preview</p>
        {watched.enabled ? (
          <div className="mt-3 space-y-2">
            <p className="font-[family-name:var(--font-display)] font-semibold">
              {brand.name}
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              {watched.description || brand.tagline || "Footer description"}
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              {watched.copyrightText ||
                `© ${new Date().getFullYear()} ${brand.name}. All rights reserved.`}
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              Contact: {watched.showContact ? "on" : "off"} · Social:{" "}
              {watched.showSocial ? "on" : "off"} · Nav:{" "}
              {watched.navVisible ? "on" : "off"}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Footer is disabled.
          </p>
        )}
      </aside>
    </form>
  );
}
