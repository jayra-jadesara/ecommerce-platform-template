"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
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
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
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
}> = [
  {
    pathKey: "logoPath",
    kind: "logo",
    label: "Logo",
    hint: "Header logo",
    previewKey: "logoUrl",
  },
  {
    pathKey: "logoDarkPath",
    kind: "dark-logo",
    label: "Dark logo",
    hint: "Optional dark mode",
    previewKey: "logoDarkUrl",
  },
  {
    pathKey: "faviconPath",
    kind: "favicon",
    label: "Favicon",
    hint: "Browser tab icon",
    previewKey: "faviconUrl",
  },
  {
    pathKey: "socialSharingImagePath",
    kind: "social-image",
    label: "Social image",
    hint: "Link previews",
    previewKey: "socialImageUrl",
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
    setError: setFieldError,
    setFocus,
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
              "Logo uploaded and theme suggested. Save branding here, then apply colors in Appearance.",
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
      className="space-y-4"
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

      <AdminSection
        title="Brand identity"
        description="Name, tagline, and how they appear in the storefront header."
        icon={<StorefrontOutlinedIcon sx={{ fontSize: 20 }} />}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Controller
              name="brandName"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Brand name"
                    fullWidth
                    required
                    size="small"
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    helperText={undefined}
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
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
                  size="small"
                  disabled={!canUpdate}
                />
              )}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-header-background)] px-3 py-2.5">
              {preview.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.logoUrl}
                  alt=""
                  className="h-8 w-auto max-w-[8rem] object-contain"
                />
              ) : (
                <span className="font-[family-name:var(--font-display)] text-sm font-semibold">
                  {watched.brandName || "Brand Name"}
                </span>
              )}
              <div className="ml-auto hidden gap-3 text-[11px] text-[var(--color-muted)] sm:flex">
                <span>Shop</span>
                <span>About</span>
              </div>
            </div>
            <div className="space-y-1 bg-[var(--color-background)] px-3 py-3">
              <p className="font-[family-name:var(--font-display)] text-base font-semibold leading-tight">
                {watched.brandName || "Brand Name"}
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                {watched.tagline?.trim() &&
                watched.tagline !== "Your store, your brand."
                  ? watched.tagline
                  : "Explore our collection"}
              </p>
            </div>
          </div>
        </div>
      </AdminSection>

      <AdminSection
        title="Brand images"
        description="Upload assets. Save this page to publish image changes."
        icon={<ImageOutlinedIcon sx={{ fontSize: 20 }} />}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {IMAGE_FIELDS.map(({ pathKey, kind, label, hint, previewKey }) => {
            const url = preview[previewKey];
            return (
              <div
                key={pathKey}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5"
              >
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-primary)_8%)]",
                    previewKey === "logoDarkUrl" && "bg-[var(--color-foreground)]",
                  )}
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={`${label} preview`}
                      className={
                        previewKey === "faviconUrl"
                          ? "h-8 w-8 object-contain"
                          : "max-h-12 max-w-12 object-contain"
                      }
                    />
                  ) : (
                    <ImageOutlinedIcon
                      sx={{ fontSize: 22, opacity: 0.45 }}
                      className="text-[var(--color-muted)]"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">{label}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted)]">
                    {hint}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <label
                      className={cn(
                        adminBtn("primary"),
                        "!px-2.5 !py-1 !text-xs cursor-pointer",
                        (!canUpdate || uploadPending === kind) &&
                          "pointer-events-none opacity-50",
                      )}
                    >
                      {uploadPending === kind
                        ? "…"
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
                      className={cn(adminBtn("outline"), "!px-2.5 !py-1 !text-xs")}
                      disabled={!canUpdate || !watched[pathKey]}
                      onClick={() =>
                        setValue(pathKey, null, { shouldDirty: true })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AdminSection>

      <LogoThemeSuggest logoUrl={preview.logoUrl} mode="branding" />
    </form>
  );
}
