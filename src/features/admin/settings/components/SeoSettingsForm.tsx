"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { saveSeoSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  DEFAULT_SEO_SETTINGS,
  seoSettingsSchema,
  type SeoSettingsFormValues,
} from "@/features/admin/settings/schemas";
import { GoogleSeoPreview } from "@/features/seo/components/GoogleSeoPreview";
import {
  buildSeoDescription,
  buildSeoTitle,
  shouldKeepAutoSeo,
} from "@/features/seo/auto-seo";
import {
  adminCard,
  adminCardPadding,
  adminCardsGrid,
  adminCardSpanFull,
  adminFieldsGrid,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";

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
  const ogTitleManual = useRef(false);
  const ogDescManual = useRef(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isDirty },
  } = useForm<SeoSettingsFormValues>({
    resolver: zodResolver(seoSettingsSchema),
    defaultValues: initialValues,
  });

  const siteTitle = useWatch({ control, name: "siteTitle" }) ?? "";
  const metaDescription = useWatch({ control, name: "metaDescription" }) ?? "";
  const canonicalUrl = useWatch({ control, name: "canonicalUrl" }) ?? "";
  const ogTitle = useWatch({ control, name: "ogTitle" }) ?? "";
  const ogDescription = useWatch({ control, name: "ogDescription" }) ?? "";

  const autoOgTitle = buildSeoTitle(siteTitle);
  const autoOgDescription = buildSeoDescription(metaDescription || siteTitle);

  useEffect(() => {
    if (ogTitleManual.current) return;
    if (!shouldKeepAutoSeo(ogTitle, autoOgTitle) && ogTitle.trim()) {
      ogTitleManual.current = true;
      return;
    }
    if (autoOgTitle !== ogTitle) {
      setValue("ogTitle", autoOgTitle, { shouldDirty: true });
    }
  }, [autoOgTitle, ogTitle, setValue]);

  useEffect(() => {
    if (ogDescManual.current) return;
    if (
      !shouldKeepAutoSeo(ogDescription, autoOgDescription) &&
      ogDescription.trim()
    ) {
      ogDescManual.current = true;
      return;
    }
    if (autoOgDescription !== ogDescription) {
      setValue("ogDescription", autoOgDescription, { shouldDirty: true });
    }
  }, [autoOgDescription, ogDescription, setValue]);

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
          reset(initialValues);
          setError(null);
          setSuccess(null);
        }}
        onResetDefaults={() => {
          reset(DEFAULT_SEO_SETTINGS);
          setSuccess(null);
        }}
      />

      <p className="text-sm text-[var(--color-muted)]">
        Set the default title and description Google shows for your store. Share
        fields update automatically unless you customize them.
      </p>

      <div className={adminCardsGrid()}>
        <div className={adminCardSpanFull()}>
          <GoogleSeoPreview
            title={siteTitle}
            url={canonicalUrl || "https://your-store.example/"}
            description={metaDescription}
          />
        </div>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={adminStackStyle}
        >
        <div>
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            1. Default Google listing
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Used for your homepage and as a fallback for other pages.
          </p>
        </div>
        <div className={adminFieldsGrid(2)}>
          <Controller
            name="siteTitle"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Store name in Google"
                fullWidth
                required
                disabled={!canUpdate}
                error={Boolean(fieldState.error)}
                helperText={
                  fieldState.error?.message ||
                  `${(field.value ?? "").length}/120 characters`
                }
              />
            )}
          />
          <Controller
            name="canonicalUrl"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Live website address (optional)"
                fullWidth
                disabled={!canUpdate}
                error={Boolean(fieldState.error)}
                placeholder="https://www.yourstore.com"
                helperText={
                  fieldState.error?.message ||
                  "Full https link to your live store. Leave blank to use the deployment URL."
                }
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
                  label="Store description in Google"
                  fullWidth
                  multiline
                  minRows={3}
                  disabled={!canUpdate}
                  helperText={`${(field.value ?? "").length}/320 characters — aim for about 150`}
                />
              )}
            />
          </div>
        </div>

        <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-foreground)]">
            Keywords (optional)
          </summary>
          <div className="mt-3">
            <Controller
              name="keywords"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Keywords"
                  fullWidth
                  disabled={!canUpdate}
                  helperText="Comma-separated words related to your store. Google mostly ignores these."
                />
              )}
            />
          </div>
        </details>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={adminStackStyle}
        >
        <div>
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            2. Social sharing
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Auto-filled from the Google fields above. Edit only if you want
            different text when shared on apps.
          </p>
        </div>
        <div className={adminFieldsGrid(2)}>
          <Controller
            name="ogTitle"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Share title"
                fullWidth
                disabled={!canUpdate}
                helperText={
                  ogTitleManual.current
                    ? "Customized"
                    : "Auto from store name"
                }
                onChange={(event) => {
                  ogTitleManual.current = true;
                  field.onChange(event);
                }}
              />
            )}
          />
          <Controller
            name="ogDescription"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Share description"
                fullWidth
                disabled={!canUpdate}
                helperText={
                  ogDescManual.current
                    ? "Customized"
                    : "Auto from store description"
                }
                onChange={(event) => {
                  ogDescManual.current = true;
                  field.onChange(event);
                }}
              />
            )}
          />
          <div className="md:col-span-2">
            <Controller
              name="ogImagePath"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ""}
                  label="Share image path (optional)"
                  fullWidth
                  disabled={!canUpdate}
                  helperText="Prefer Branding settings for the default share image."
                  onChange={(event) =>
                    field.onChange(event.target.value.trim() || null)
                  }
                />
              )}
            />
          </div>
        </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()} ${adminCardSpanFull()}`}
          style={adminStackStyle}
        >
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          3. Search engine access
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Leave these on for a public store. Turn off while building privately.
        </p>
        <div className={adminFieldsGrid(2)}>
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
                label="Allow Google to list this store"
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
        </div>
        </section>
      </div>
    </form>
  );
}
