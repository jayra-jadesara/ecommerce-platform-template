"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  saveBrandingSettingsAction,
  uploadBrandingImageAction,
} from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  DEFAULT_BRANDING_SETTINGS,
  brandingSettingsSchema,
  type BrandingSettingsFormValues,
} from "@/features/admin/settings/schemas";
import type { BrandingUploadKind } from "@/features/admin/settings/update-branding";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";

interface BrandingSettingsFormProps {
  initialValues: BrandingSettingsFormValues;
  initialPreviewUrls: {
    logoUrl?: string;
    logoDarkUrl?: string;
    faviconUrl?: string;
    socialImageUrl?: string;
  };
  canUpdate: boolean;
}

const IMAGE_FIELDS: Array<{
  pathKey: keyof Pick<
    BrandingSettingsFormValues,
    "logoPath" | "logoDarkPath" | "faviconPath" | "socialSharingImagePath"
  >;
  kind: BrandingUploadKind;
  label: string;
}> = [
  { pathKey: "logoPath", kind: "logo", label: "Logo" },
  { pathKey: "logoDarkPath", kind: "dark-logo", label: "Dark mode logo" },
  { pathKey: "faviconPath", kind: "favicon", label: "Favicon" },
  {
    pathKey: "socialSharingImagePath",
    kind: "social-image",
    label: "Social sharing image",
  },
];

export function BrandingSettingsForm({
  initialValues,
  initialPreviewUrls,
  canUpdate,
}: BrandingSettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploadPending, setUploadPending] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isDirty },
  } = useForm<BrandingSettingsFormValues>({
    resolver: zodResolver(brandingSettingsSchema),
    defaultValues: initialValues,
  });

  const watched = useWatch({ control });

  const preview = useMemo(
    () => ({
      logoUrl:
        resolvePublicStorageUrl("branding", watched.logoPath) ||
        initialPreviewUrls.logoUrl,
      logoDarkUrl:
        resolvePublicStorageUrl("branding", watched.logoDarkPath) ||
        initialPreviewUrls.logoDarkUrl,
      faviconUrl:
        resolvePublicStorageUrl("branding", watched.faviconPath) ||
        initialPreviewUrls.faviconUrl,
      socialImageUrl:
        resolvePublicStorageUrl("branding", watched.socialSharingImagePath) ||
        initialPreviewUrls.socialImageUrl,
    }),
    [watched, initialPreviewUrls],
  );

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveBrandingSettingsAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      reset(values);
      router.refresh();
    });
  });

  async function handleUpload(
    kind: BrandingUploadKind,
    pathKey: (typeof IMAGE_FIELDS)[number]["pathKey"],
    file: File | null,
  ) {
    if (!file || !canUpdate) return;
    setUploadPending(kind);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadBrandingImageAction(kind, formData);
    setUploadPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.path) {
      setValue(pathKey, result.path, { shouldDirty: true });
      setSuccess("Image uploaded. Save to publish.");
    }
  }

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
          reset(DEFAULT_BRANDING_SETTINGS);
          setSuccess(null);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <Controller
            name="brandName"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Brand name"
                fullWidth
                disabled={!canUpdate}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="tagline"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Tagline"
                fullWidth
                disabled={!canUpdate}
              />
            )}
          />

          {IMAGE_FIELDS.map(({ pathKey, kind, label }) => (
            <div
              key={pathKey}
              className="rounded-lg border border-[var(--color-border)] p-3"
            >
              <p className="mb-2 text-sm font-medium">{label}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  component="label"
                  variant="outlined"
                  disabled={!canUpdate || uploadPending === kind}
                >
                  {uploadPending === kind ? "Uploading…" : "Upload"}
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      void handleUpload(kind, pathKey, file);
                      event.target.value = "";
                    }}
                  />
                </Button>
                <Button
                  type="button"
                  variant="text"
                  color="inherit"
                  disabled={!canUpdate || !watched[pathKey]}
                  onClick={() =>
                    setValue(pathKey, null, { shouldDirty: true })
                  }
                >
                  Remove
                </Button>
                <span className="text-xs text-[var(--color-muted)]">
                  {watched[pathKey] || "No image"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm font-semibold">Live preview</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Unsaved until you click Save.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {watched.brandName || "Brand Name"}
              </p>
              <p className="text-sm text-[var(--color-muted)]">
                {watched.tagline || "Tagline"}
              </p>
            </div>
            {preview.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.logoUrl}
                alt="Logo preview"
                className="h-10 w-auto"
              />
            ) : null}
            {preview.logoDarkUrl ? (
              <div className="rounded-md bg-[#111] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.logoDarkUrl}
                  alt="Dark logo preview"
                  className="h-10 w-auto"
                />
              </div>
            ) : null}
            {preview.faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.faviconUrl}
                alt="Favicon preview"
                className="h-8 w-8"
              />
            ) : null}
            {preview.socialImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.socialImageUrl}
                alt="Social image preview"
                className="max-h-40 w-full rounded-md object-cover"
              />
            ) : null}
          </div>
        </aside>
      </div>
    </form>
  );
}
