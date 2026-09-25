"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import { saveSeoSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  DEFAULT_SEO_SETTINGS,
  seoSettingsSchema,
  type SeoSettingsFormValues,
} from "@/features/admin/settings/schemas";
import type { PageSeoSourceInfo } from "@/features/admin/settings/seo-page-sources";
import {
  adminBtn,
  adminCard,
  adminCardsGrid,
  adminCardSpanFull,
  adminFieldsGrid,
} from "@/features/admin/ui/admin-classes";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import {
  buildSeoDescription,
  buildSeoTitle,
  shouldKeepAutoSeo,
} from "@/features/seo/auto-seo";
import { GoogleSeoPreview } from "@/features/seo/components/GoogleSeoPreview";
import { buildDefaultSitemapPaths } from "@/features/seo/sitemap-paths";
import { MediaPicker } from "@/features/media/components/MediaPicker";
import {
  ADMIN_IMAGE_MAX_MB_DEFAULT,
  formatMaxMbHint,
} from "@/features/media/upload-limits";
import { cn } from "@/lib/cn";
import {
  resolvePublicStorageUrl,
  resolveStoragePathUrl,
} from "@/lib/supabase/storage-url";

interface SeoSettingsFormProps {
  initialValues: SeoSettingsFormValues;
  canUpdate: boolean;
  storeDisplayName: string;
  sitemapUrl: string;
  robotsUrl: string;
  missingProductSeoCount: number;
  productsAdminHref: string;
  pageSources: PageSeoSourceInfo[];
  ogImageUrl?: string;
  adminImageMaxMb?: number;
}

const PAGE_SEO_FIELDS: Array<{
  key: string;
  titleName: keyof SeoSettingsFormValues;
  descName: keyof SeoSettingsFormValues;
  label: string;
  path: string;
}> = [
  {
    key: "about",
    titleName: "pageAboutTitle",
    descName: "pageAboutDescription",
    label: "About",
    path: "/about",
  },
  {
    key: "contact",
    titleName: "pageContactTitle",
    descName: "pageContactDescription",
    label: "Contact",
    path: "/contact",
  },
  {
    key: "career",
    titleName: "pageCareerTitle",
    descName: "pageCareerDescription",
    label: "Career",
    path: "/career",
  },
  {
    key: "products",
    titleName: "pageProductsTitle",
    descName: "pageProductsDescription",
    label: "Products",
    path: "/products",
  },
  {
    key: "blog",
    titleName: "pageBlogTitle",
    descName: "pageBlogDescription",
    label: "Blog",
    path: "/blog",
  },
  {
    key: "brochure",
    titleName: "pageBrochureTitle",
    descName: "pageBrochureDescription",
    label: "Brochure",
    path: "/brochure",
  },
  {
    key: "privacy",
    titleName: "pagePrivacyTitle",
    descName: "pagePrivacyDescription",
    label: "Privacy",
    path: "/privacy",
  },
  {
    key: "terms",
    titleName: "pageTermsTitle",
    descName: "pageTermsDescription",
    label: "Terms",
    path: "/terms",
  },
  {
    key: "disclaimer",
    titleName: "pageDisclaimerTitle",
    descName: "pageDisclaimerDescription",
    label: "Disclaimer",
    path: "/disclaimer",
  },
];

function Section({
  title,
  hint,
  children,
  className,
  badge,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  badge?: string;
}) {
  return (
    <section
      className={cn(adminCard(), "p-3 md:p-3.5", className)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
        width: "100%",
      }}
    >
      <header className="flex flex-wrap items-start justify-between gap-1.5">
        <div className="min-w-0">
          <h2 className="text-[12px] font-semibold tracking-tight text-[var(--color-foreground)]">
            {title}
          </h2>
          {hint ? (
            <p className="mt-0.5 text-[10px] leading-snug text-[var(--color-muted)]">
              {hint}
            </p>
          ) : null}
        </div>
        {badge ? (
          <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {badge}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function HealthRow({
  ok,
  label,
  detail,
  action,
}: {
  ok: boolean;
  label: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-start gap-2 text-[11px] leading-snug">
      <span
        className={cn(
          "mt-0.5 inline-block size-1.5 shrink-0 rounded-full",
          ok ? "bg-emerald-500" : "bg-amber-500",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="font-medium text-[var(--color-foreground)]">
          {label}
        </span>
        {detail ? (
          <span className="mt-0.5 block text-[var(--color-muted)]">{detail}</span>
        ) : null}
        {action ? <span className="mt-1 block">{action}</span> : null}
      </span>
    </li>
  );
}

function ogPreviewUrl(
  path: string | null | undefined,
  fallback?: string,
): string | undefined {
  return (
    resolveStoragePathUrl(path, ["branding", "media", "cms"]) ||
    resolvePublicStorageUrl("branding", path) ||
    fallback
  );
}

export function SeoSettingsForm({
  initialValues,
  canUpdate,
  storeDisplayName,
  sitemapUrl,
  robotsUrl,
  missingProductSeoCount,
  productsAdminHref,
  pageSources,
  ogImageUrl,
  adminImageMaxMb = ADMIN_IMAGE_MAX_MB_DEFAULT,
}: SeoSettingsFormProps) {
  const router = useRouter();
  const sizeHint = formatMaxMbHint(adminImageMaxMb);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<"sitemap" | "robots" | null>(null);
  const [ogPickerOpen, setOgPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ogTitleManual = useRef(false);
  const ogDescManual = useRef(false);
  const [customGoogleByKey, setCustomGoogleByKey] = useState<
    Record<string, boolean>
  >(() => {
    const init: Record<string, boolean> = {};
    for (const page of PAGE_SEO_FIELDS) {
      const title = String(initialValues[page.titleName] ?? "").trim();
      const desc = String(initialValues[page.descName] ?? "").trim();
      init[page.key] = Boolean(title || desc);
    }
    return init;
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError: setFieldError,
    setFocus,
    formState: { isDirty },
  } = useForm<SeoSettingsFormValues>({
    resolver: zodResolver(seoSettingsSchema),
    defaultValues: initialValues,
  });

  const {
    fields: sitemapPathFields,
  } = useFieldArray({
    control,
    name: "sitemapPaths",
    keyName: "fieldKey",
  });

  const siteTitle = useWatch({ control, name: "siteTitle" }) ?? "";
  const siteName = useWatch({ control, name: "siteName" }) ?? "";
  const metaDescription = useWatch({ control, name: "metaDescription" }) ?? "";
  const canonicalUrl = useWatch({ control, name: "canonicalUrl" }) ?? "";
  const ogTitle = useWatch({ control, name: "ogTitle" }) ?? "";
  const ogDescription = useWatch({ control, name: "ogDescription" }) ?? "";
  const ogImagePath = useWatch({ control, name: "ogImagePath" });
  const robotsIndex = useWatch({ control, name: "robotsIndex" });
  const googleSiteVerification =
    useWatch({ control, name: "googleSiteVerification" }) ?? "";
  const watchedPages = useWatch({ control });
  const catalogPaths = useWatch({ control, name: "storefrontPaths" }) ?? [];

  const previewOgUrl = useMemo(
    () => ogPreviewUrl(ogImagePath, ogImageUrl),
    [ogImagePath, ogImageUrl],
  );

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

  const sourceByKey = useMemo(() => {
    const map = new Map<string, PageSeoSourceInfo>();
    for (const s of pageSources) map.set(s.key, s);
    return map;
  }, [pageSources]);

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    const cleaned: SeoSettingsFormValues = { ...values };
    for (const page of PAGE_SEO_FIELDS) {
      if (!customGoogleByKey[page.key]) {
        (cleaned as Record<string, unknown>)[page.titleName] = "";
        (cleaned as Record<string, unknown>)[page.descName] = "";
      }
    }
    startTransition(async () => {
      const result = await saveSeoSettingsAction(cleaned);
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
      reset(cleaned);
      router.refresh();
    });
  });

  async function copyText(kind: "sitemap" | "robots", value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="w-full"
      style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}
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
          reset({
            ...DEFAULT_SEO_SETTINGS,
            siteTitle: storeDisplayName || DEFAULT_SEO_SETTINGS.siteTitle,
          });
          setSuccess(null);
        }}
      />

      <div className={cn(adminCardsGrid(), "!gap-2.5")}>
        <Section
          title="Health checklist"
          hint="Everything here saves to the database. Address & socials for LocalBusiness come from Store Information."
          className={adminCardSpanFull()}
          badge="Live"
        >
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <HealthRow
              ok={Boolean(siteTitle.trim())}
              label="Store name in Google"
              detail={siteTitle.trim() || "Required"}
            />
            <HealthRow
              ok={Boolean(metaDescription.trim())}
              label="Meta description"
              detail={
                metaDescription.trim()
                  ? `${metaDescription.trim().length} characters`
                  : "Add a short store pitch (~150 chars)"
              }
            />
            <HealthRow
              ok={Boolean(canonicalUrl.trim())}
              label="Live website URL"
              detail={
                canonicalUrl.trim() ||
                "Set this for correct canonicals & sitemap"
              }
            />
            <HealthRow
              ok={Boolean(robotsIndex)}
              label="Indexing allowed"
              detail={
                robotsIndex
                  ? "Store can appear in Google"
                  : "noindex — sitemap emptied"
              }
            />
            <HealthRow
              ok={Boolean(googleSiteVerification.trim())}
              label="Search Console"
              detail={
                googleSiteVerification.trim()
                  ? "Verification meta set"
                  : "Paste HTML-tag content token below"
              }
              action={
                <a
                  href="https://search.google.com/search-console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--color-primary)]"
                >
                  Open Search Console
                  <OpenInNewOutlinedIcon sx={{ fontSize: 11 }} />
                </a>
              }
            />
            <HealthRow
              ok={Boolean(previewOgUrl)}
              label="Share / OG image"
              detail={
                previewOgUrl
                  ? "Ready for link previews"
                  : "Upload below (or Branding social image)"
              }
            />
            <HealthRow
              ok={pageSources.length > 0}
              label="Page titles for Google"
              detail={`${Object.values(customGoogleByKey).filter(Boolean).length} custom override(s) — others use Content / Store Information`}
            />
            <HealthRow
              ok={missingProductSeoCount === 0}
              label="Product titles for Google"
              detail={
                missingProductSeoCount === 0
                  ? "Filled from each product’s name (and short description) when you save"
                  : `${missingProductSeoCount} product(s) still need a save so the name can fill the Google title`
              }
              action={
                missingProductSeoCount > 0 ? (
                  <Link
                    href={productsAdminHref}
                    className="text-[10px] font-medium text-[var(--color-primary)]"
                  >
                    Open Products →
                  </Link>
                ) : null
              }
            />
          </ul>
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-2">
            {sitemapUrl ? (
              <>
                <code className="max-w-[min(100%,20rem)] truncate rounded-md bg-[var(--color-surface)] px-2 py-1 text-[10px] text-[var(--color-muted)]">
                  {sitemapUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void copyText("sitemap", sitemapUrl)}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)]"
                >
                  <ContentCopyOutlinedIcon sx={{ fontSize: 12 }} />
                  {copied === "sitemap" ? "Copied" : "Sitemap"}
                </button>
                <a
                  href={sitemapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)]"
                >
                  <OpenInNewOutlinedIcon sx={{ fontSize: 12 }} />
                  Open
                </a>
              </>
            ) : null}
            {robotsUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => void copyText("robots", robotsUrl)}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)]"
                >
                  <ContentCopyOutlinedIcon sx={{ fontSize: 12 }} />
                  {copied === "robots" ? "Copied" : "robots.txt"}
                </button>
                <a
                  href={robotsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)]"
                >
                  <OpenInNewOutlinedIcon sx={{ fontSize: 12 }} />
                  robots.txt
                </a>
              </>
            ) : null}
          </div>
        </Section>

        <div className={adminCardSpanFull()}>
          <GoogleSeoPreview
            title={siteName.trim() || siteTitle}
            url={canonicalUrl || "https://your-store.example/"}
            description={metaDescription}
          />
        </div>

        <Section
          title="Default Google listing"
          hint="Homepage + fallback when a page has no own SEO."
        >
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="siteTitle"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Store name in Google"
                    fullWidth
                    required
                    size="small"
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error
                        ? undefined
                        : `${(field.value ?? "").length}/120`
                    }
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="siteName"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Google site name"
                    fullWidth
                    size="small"
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error
                        ? undefined
                        : "Blank = store name above"
                    }
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="canonicalUrl"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Live website address"
                    fullWidth
                    size="small"
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    placeholder="https://www.yourstore.com"
                    helperText={
                      fieldState.error
                        ? undefined
                        : "Canonical + sitemap origin"
                    }
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="titleTemplate"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Title template"
                    fullWidth
                    size="small"
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    placeholder="%s | Store name"
                    helperText={
                      fieldState.error
                        ? undefined
                        : "Blank = auto from store name"
                    }
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <div className="md:col-span-2">
              <Controller
                name="metaDescription"
                control={control}
                render={({ field, fieldState }) => (
                  <div>
                    <TextField
                      {...field}
                      label="Store description in Google"
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      disabled={!canUpdate}
                      error={Boolean(fieldState.error)}
                      helperText={
                        fieldState.error
                          ? undefined
                          : `${(field.value ?? "").length}/320 — aim ~150`
                      }
                    />
                    <FieldError message={fieldState.error?.message} />
                  </div>
                )}
              />
            </div>
            <Controller
              name="twitterHandle"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="X / Twitter handle"
                    fullWidth
                    size="small"
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    placeholder="@yourstore"
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <div className="md:col-span-2">
              <details className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2">
                <summary className="cursor-pointer text-[11px] font-medium text-[var(--color-foreground)]">
                  Keywords (optional — Google mostly ignores)
                </summary>
                <div className="mt-2">
                  <Controller
                    name="keywords"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Keywords"
                        fullWidth
                        size="small"
                        disabled={!canUpdate}
                        helperText="Comma-separated"
                      />
                    )}
                  />
                </div>
              </details>
            </div>
          </div>
        </Section>

        <Section
          title="Search Console & crawl"
          hint="Verification meta + index/follow from this store’s SEO row."
        >
          <Controller
            name="googleSiteVerification"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <TextField
                  {...field}
                  label="Google site verification"
                  fullWidth
                  size="small"
                  disabled={!canUpdate}
                  error={Boolean(fieldState.error)}
                  placeholder="Paste content= token only"
                  helperText={
                    fieldState.error
                      ? undefined
                      : "Search Console → HTML tag → content value only"
                  }
                />
                <FieldError message={fieldState.error?.message} />
              </div>
            )}
          />
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="robotsIndex"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!canUpdate}
                  label="Allow Google to list this store"
                  variant="row"
                />
              )}
            />
            <Controller
              name="robotsFollow"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!canUpdate}
                  label="Allow following links"
                  variant="row"
                />
              )}
            />
          </div>
        </Section>

        <Section
          title="Social sharing"
          hint="Auto from Google fields unless customized. Image uploads here."
        >
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="ogTitle"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Share title"
                  fullWidth
                  size="small"
                  disabled={!canUpdate}
                  helperText={
                    ogTitleManual.current ? "Customized" : "Auto from store name"
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
                  size="small"
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
              <div className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-primary)_8%)]">
                  {previewOgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewOgUrl}
                      alt="Share image preview"
                      className="max-h-12 max-w-12 object-contain"
                    />
                  ) : (
                    <ImageOutlinedIcon
                      sx={{ fontSize: 22, opacity: 0.45 }}
                      className="text-[var(--color-muted)]"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">
                    Share / OG image
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                    Link previews · {sizeHint}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className={cn(adminBtn("primary"), "!px-2.5 !py-1 !text-xs")}
                      disabled={!canUpdate || pending}
                      onClick={() => setOgPickerOpen(true)}
                    >
                      {previewOgUrl ? "Replace" : "Upload"}
                    </button>
                    <button
                      type="button"
                      className={cn(adminBtn("outline"), "!px-2.5 !py-1 !text-xs")}
                      disabled={!canUpdate || !ogImagePath}
                      onClick={() =>
                        setValue("ogImagePath", null, { shouldDirty: true })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Help Google show your store"
          hint="These options tell Google what your business is (name, address, phone). Address and phone come from Store Information — you do not type them again here. Social links from Branding are included automatically."
          className={adminCardSpanFull()}
        >
          <div className={adminFieldsGrid(3)}>
            <Controller
              name="schemaLocalBusiness"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!canUpdate}
                  label="Show as a local shop (address & phone)"
                  variant="row"
                />
              )}
            />
            <Controller
              name="schemaOrganization"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!canUpdate}
                  label="Show as a company (when local shop is off)"
                  variant="row"
                />
              )}
            />
            <Controller
              name="schemaWebsiteSearch"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!canUpdate}
                  label="Offer a search box in Google results"
                  variant="row"
                />
              )}
            />
          </div>
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="schemaBusinessType"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="What kind of store is this?"
                    fullWidth
                    size="small"
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    placeholder="Store"
                    helperText={
                      fieldState.error
                        ? undefined
                        : "Examples: Store, GroceryStore, ClothingStore"
                    }
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="schemaPriceRange"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Typical price level"
                    fullWidth
                    size="small"
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    placeholder="₹ or $$"
                    helperText={
                      fieldState.error ? undefined : "Optional — how pricey most items feel"
                    }
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="schemaGeoLat"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Map pin — latitude"
                    fullWidth
                    size="small"
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    placeholder="28.6139"
                    helperText={
                      fieldState.error
                        ? undefined
                        : "Optional. Copy from Google Maps if you want a map pin"
                    }
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="schemaGeoLng"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Map pin — longitude"
                    fullWidth
                    size="small"
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    placeholder="77.2090"
                    helperText={
                      fieldState.error
                        ? undefined
                        : "Optional. Pair with latitude above"
                    }
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
          </div>
        </Section>

        <Section
          title="Your website pages"
          hint="These names and addresses come from Menu & Navigation for this store. Change them there — Google & SEO only shows them."
          className={adminCardSpanFull()}
        >
          {catalogPaths.length === 0 ? (
            <p className="text-[11px] text-[var(--color-muted)]">
              No menu pages yet.{" "}
              <Link
                href={getAdminPath("/settings/navigation")}
                className="font-medium text-[var(--color-primary)]"
              >
                Open Menu & Navigation
              </Link>{" "}
              to add pages, then return here.
            </p>
          ) : (
            <div className="space-y-2">
              {catalogPaths.map((row) => (
                <div
                  key={row.id || row.path}
                  className="grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 sm:grid-cols-2 sm:items-end"
                >
                  <TextField
                    label="Page address"
                    value={row.path}
                    fullWidth
                    size="small"
                    disabled
                    helperText="From Menu & Navigation (read-only)"
                  />
                  <TextField
                    label="Page name"
                    value={row.label || row.path}
                    fullWidth
                    size="small"
                    disabled
                    helperText="From Menu & Navigation (read-only)"
                  />
                </div>
              ))}
            </div>
          )}
          <Link
            href={getAdminPath("/settings/navigation")}
            className="inline-flex text-[11px] font-medium text-[var(--color-primary)]"
          >
            Edit pages in Menu & Navigation →
          </Link>
        </Section>

        <Section
          title="What Google can list (sitemap)"
          hint="Page address and name always match Menu & Navigation for this store (read-only). Use Include and Importance here. Add or rename pages only in Menu & Navigation."
          className={adminCardSpanFull()}
        >
          <div className={adminFieldsGrid(3)}>
            <Controller
              name="sitemapProducts"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!canUpdate}
                  label="Include each product page"
                  variant="row"
                />
              )}
            />
            <Controller
              name="sitemapCategories"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!canUpdate}
                  label="Include each category page"
                  variant="row"
                />
              )}
            />
            <Controller
              name="sitemapBlog"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!canUpdate}
                  label="Include each blog post"
                  variant="row"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            {sitemapPathFields.map((row, index) => (
              <div
                key={row.fieldKey}
                className="grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 sm:grid-cols-[auto_minmax(8rem,1fr)_minmax(8rem,1fr)_5.5rem] sm:items-end"
              >
                <Controller
                  name={`sitemapPaths.${index}.enabled`}
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate}
                      label="Include"
                      variant="row"
                    />
                  )}
                />
                <Controller
                  name={`sitemapPaths.${index}.path`}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Page address"
                      value={field.value || ""}
                      fullWidth
                      size="small"
                      disabled
                      helperText="From Menu & Navigation (read-only)"
                    />
                  )}
                />
                <Controller
                  name={`sitemapPaths.${index}.label`}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Page name"
                      value={field.value || row.path || ""}
                      fullWidth
                      size="small"
                      disabled
                      helperText="From Menu & Navigation (read-only)"
                    />
                  )}
                />
                <Controller
                  name={`sitemapPaths.${index}.priority`}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      slotProps={{ htmlInput: { min: 0, max: 1, step: 0.1 } }}
                      label="Importance"
                      fullWidth
                      size="small"
                      disabled={!canUpdate}
                      helperText="0–1"
                      onChange={(event) =>
                        field.onChange(Number(event.target.value) || 0)
                      }
                    />
                  )}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(adminBtn("outline"), "!px-2.5 !py-1 !text-xs")}
              disabled={!canUpdate || pending || catalogPaths.length === 0}
              onClick={() =>
                setValue(
                  "sitemapPaths",
                  buildDefaultSitemapPaths(catalogPaths),
                  { shouldDirty: true },
                )
              }
            >
              Reset Include &amp; Importance
            </button>
            <Link
              href={getAdminPath("/settings/navigation")}
              className="inline-flex items-center text-[11px] font-medium text-[var(--color-primary)]"
            >
              Edit pages in Menu & Navigation →
            </Link>
          </div>
        </Section>

        <Section
          title="How each page looks in Google"
          hint="Titles already come from your Content and Store Information. Only turn on “Use different text for Google” if you need a special listing."
          className={adminCardSpanFull()}
        >
          <div className="grid gap-2 md:grid-cols-2">
            {PAGE_SEO_FIELDS.map((page) => {
              const source = sourceByKey.get(page.key);
              const isCustom = Boolean(customGoogleByKey[page.key]);
              const liveTitle =
                (isCustom
                  ? String(watchedPages?.[page.titleName] ?? "").trim()
                  : "") ||
                source?.sourceTitle ||
                page.label;
              const liveDesc =
                (isCustom
                  ? String(watchedPages?.[page.descName] ?? "").trim()
                  : "") ||
                source?.sourceDescription ||
                "";

              return (
                <div
                  key={page.key}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[11px] font-semibold text-[var(--color-foreground)]">
                      {page.label}
                    </p>
                    <span className="text-[9px] text-[var(--color-muted)]">
                      {page.path}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--color-muted)]">
                    {source?.sourceHint || "From your store content"}
                  </p>
                  {!isCustom ? (
                    <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-2">
                      <p className="text-[11px] font-medium text-[var(--color-foreground)]">
                        {liveTitle || "—"}
                      </p>
                      <p className="mt-1 text-[10px] leading-snug text-[var(--color-muted)]">
                        {liveDesc || "No description yet — edit this page in Content or Store Information."}
                      </p>
                    </div>
                  ) : null}
                  <AdminToggle
                    checked={isCustom}
                    onChange={(next) => {
                      setCustomGoogleByKey((prev) => ({
                        ...prev,
                        [page.key]: next,
                      }));
                      if (next) {
                        const curTitle = String(
                          watchedPages?.[page.titleName] ?? "",
                        ).trim();
                        const curDesc = String(
                          watchedPages?.[page.descName] ?? "",
                        ).trim();
                        if (!curTitle && source?.sourceTitle) {
                          setValue(page.titleName, source.sourceTitle, {
                            shouldDirty: true,
                          });
                        }
                        if (!curDesc && source?.sourceDescription) {
                          setValue(page.descName, source.sourceDescription, {
                            shouldDirty: true,
                          });
                        }
                      } else {
                        setValue(page.titleName, "", { shouldDirty: true });
                        setValue(page.descName, "", { shouldDirty: true });
                      }
                    }}
                    disabled={!canUpdate}
                    label="Use different text for Google"
                    variant="row"
                  />
                  {isCustom ? (
                    <>
                      <Controller
                        name={page.titleName}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            value={String(field.value ?? "")}
                            label="Google title"
                            fullWidth
                            size="small"
                            disabled={!canUpdate}
                          />
                        )}
                      />
                      <Controller
                        name={page.descName}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            value={String(field.value ?? "")}
                            label="Google description"
                            fullWidth
                            size="small"
                            multiline
                            minRows={2}
                            disabled={!canUpdate}
                          />
                        )}
                      />
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <MediaPicker
        open={ogPickerOpen}
        onClose={() => setOgPickerOpen(false)}
        folder="branding"
        allowUpload
        adminImageMaxMb={adminImageMaxMb}
        onSelect={(selection) => {
          setValue("ogImagePath", selection.storagePath, { shouldDirty: true });
          setOgPickerOpen(false);
        }}
      />
    </form>
  );
}
