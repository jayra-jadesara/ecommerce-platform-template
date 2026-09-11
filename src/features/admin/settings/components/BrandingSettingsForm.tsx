"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { AdminSection } from "@/features/admin/ui/AdminCard";
import {
  adminBtn,
  adminCardSpanFull,
  adminCardsGrid,
  adminFormGrid,
} from "@/features/admin/ui/admin-classes";
import {
  LogoThemeSuggest,
  suggestThemeFromLogoFile,
} from "@/features/admin/theme/components/LogoThemeSuggest";
import { cn } from "@/lib/cn";
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
  hint: string;
  previewKey: "logoUrl" | "logoDarkUrl" | "faviconUrl" | "socialImageUrl";
  tall?: boolean;
}> = [
  {
    pathKey: "logoPath",
    kind: "logo",
    label: "Logo",
    hint: "JPEG, PNG, or WebP. Shown in the storefront header.",
    previewKey: "logoUrl",
  },
  {
    pathKey: "logoDarkPath",
    kind: "dark-logo",
    label: "Dark mode logo",
    hint: "Optional logo for dark backgrounds.",
    previewKey: "logoDarkUrl",
  },
  {
    pathKey: "faviconPath",
    kind: "favicon",
    label: "Favicon",
    hint: "Small square icon for browser tabs.",
    previewKey: "faviconUrl",
  },
  {
    pathKey: "socialSharingImagePath",
    kind: "social-image",
    label: "Social sharing image",
    hint: "Used when links are shared on social networks.",
    previewKey: "socialImageUrl",
    tall: true,
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
      if (kind === "logo" && file) {
        void suggestThemeFromLogoFile(file).then((theme) => {
          if (theme) {
            setSuccess(
              "Image uploaded. Brand theme suggested from your logo — review it below, then open Appearance to apply.",
            );
          }
        });
      }
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-5"
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

      <div className={adminCardsGrid()}>
        <AdminSection
          title="Brand identity"
          description="Name and tagline shown across your storefront."
        >
          <div className={adminFormGrid()}>
            <Controller
              name="brandName"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Brand name"
                  fullWidth
                  required
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
          </div>
        </AdminSection>

        <AdminSection
          title="Brand images"
          description="Upload logos and icons. Changes apply after you save."
        >
            <div className="grid gap-3 sm:grid-cols-2">
              {IMAGE_FIELDS.map(
                ({ pathKey, kind, label, hint, previewKey, tall }) => {
                  const url = preview[previewKey];
                  return (
                    <div
                      key={pathKey}
                      className="overflow-hidden rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)] bg-[var(--color-surface)]"
                    >
                    <div
                      className={`flex items-center justify-center bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-primary)_8%)] ${
                        tall ? "min-h-48 p-5" : "min-h-36 p-8"
                      } ${previewKey === "logoDarkUrl" ? "bg-[var(--color-foreground)]" : ""}`}
                    >
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={`${label} preview`}
                          className={
                            tall
                              ? "max-h-40 w-full object-contain"
                              : previewKey === "faviconUrl"
                                ? "h-14 w-14 object-contain"
                                : "max-h-24 w-auto max-w-full object-contain"
                          }
                        />
                      ) : (
                        <p className="text-sm text-[var(--color-muted)]">
                          No image yet
                        </p>
                      )}
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          {hint}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label
                          className={cn(
                            adminBtn("primary"),
                            "cursor-pointer",
                            (!canUpdate || uploadPending === kind) &&
                              "pointer-events-none opacity-50",
                          )}
                        >
                          {uploadPending === kind
                            ? "Uploading…"
                            : url
                              ? "Replace"
                              : "Upload"}
                          <input
                            hidden
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={!canUpdate || uploadPending === kind}
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              void handleUpload(kind, pathKey, file);
                              event.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className={adminBtn("outline")}
                          disabled={!canUpdate || !watched[pathKey]}
                          onClick={() =>
                            setValue(pathKey, null, { shouldDirty: true })
                          }
                        >
                          Remove
                        </button>
                      </div>
                      {watched[pathKey] ? (
                        <details className="text-xs text-[var(--color-muted)]">
                          <summary className="cursor-pointer">
                            File details
                          </summary>
                          <p className="mt-1 break-all">{watched[pathKey]}</p>
                        </details>
                      ) : null}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </AdminSection>

        <div className={adminCardSpanFull()}>
          <LogoThemeSuggest logoUrl={preview.logoUrl} mode="branding" />
        </div>

        <AdminSection
          className={adminCardSpanFull()}
          title="Live preview"
          description="How your brand may appear in the storefront header."
        >
          <div className="overflow-hidden rounded-[var(--radius-default,0.75rem)] border border-[var(--color-border)]">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-header-background)] px-4 py-4">
              {preview.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.logoUrl}
                  alt=""
                  className="h-10 w-auto max-w-[10rem] object-contain"
                />
              ) : (
                <span className="font-[family-name:var(--font-display)] text-lg font-semibold">
                  {watched.brandName || "Brand Name"}
                </span>
              )}
              <div className="ml-auto hidden gap-3 text-xs text-[var(--color-muted)] sm:flex">
                <span>Shop</span>
                <span>About</span>
              </div>
            </div>
            <div className="space-y-2 bg-[var(--color-background)] p-4">
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {watched.brandName || "Brand Name"}
              </p>
              <p className="text-sm text-[var(--color-muted)]">
                {watched.tagline?.trim() &&
                watched.tagline !== "Your store, your brand."
                  ? watched.tagline
                  : "Explore our collection"}
              </p>
            </div>
          </div>
        </AdminSection>
      </div>
    </form>
  );
}
