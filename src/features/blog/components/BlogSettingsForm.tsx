"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import { AdminSaveBar } from "@/features/admin/ui/AdminSaveBar";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { StorePageLinkField } from "@/features/admin/ui/StorePageLinkField";
import { saveBlogSettingsAction } from "@/features/blog/actions";
import {
  CoverReadMoreBadge,
  COVER_CTA_STYLE_META,
} from "@/features/blog/components/CoverReadMoreBadge";
import {
  BLOG_COVER_CTA_STYLES,
  blogSettingsFormSchema,
  type BlogSettingsFormValues,
} from "@/features/blog/schemas";
import type { BlogCoverCtaStyle } from "@/features/blog/types";
import {
  adminCard,
  adminFieldsGrid,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import { cn } from "@/lib/cn";

type FeaturedOption = { id: string; title: string };

function SettingsSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(adminCard(), "p-3.5 md:p-4")} style={adminStackStyle}>
      <div className="space-y-3" style={adminStackStyle}>
        <div className="border-b border-[var(--color-border)] pb-2">
          <p className="text-[0.8125rem] font-semibold text-[var(--color-foreground)]">
            {title}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-muted)]">
            {hint}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

/** Mini mock of what shoppers see on /blog — updates as settings change. */
function ListingLivePreview({
  cardStyle,
  coverCtaStyle,
  layoutPreset,
  showFeaturedPost,
  showCategories,
  showSearch,
  showAuthor,
  showDate,
}: {
  cardStyle: string;
  coverCtaStyle: BlogCoverCtaStyle;
  layoutPreset: string;
  showFeaturedPost: boolean;
  showCategories: boolean;
  showSearch: boolean;
  showAuthor: boolean;
  showDate: boolean;
}) {
  const isList = layoutPreset === "LIST";
  const isCover = !isList && cardStyle === "COVER";
  const layoutLabel = isList ? "List" : "Grid";
  const styleLabel = isList
    ? "Compact rows"
    : cardStyle === "COVER"
      ? "Cover cards"
      : cardStyle === "MINIMAL"
        ? "Minimal"
        : cardStyle === "EDITORIAL"
          ? "Editorial"
          : "Standard cards";

  return (
    <aside className="lg:sticky lg:top-4">
      <div className={cn(adminCard(), "space-y-3 p-3.5")}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[0.8125rem] font-semibold text-[var(--color-foreground)]">
              What shoppers see
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
              Updates as you change options below.
            </p>
          </div>
          <Link
            href="/blog"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[11px] font-semibold text-[var(--color-primary)] hover:underline"
          >
            Open /blog →
          </Link>
        </div>

        <div className="flex flex-wrap gap-1">
          <span className="rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-foreground)] ring-1 ring-[var(--color-border)]">
            {layoutLabel}
          </span>
          <span className="rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-foreground)] ring-1 ring-[var(--color-border)]">
            {styleLabel}
          </span>
          {showFeaturedPost ? (
            <span className="rounded-md bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
              Featured
            </span>
          ) : null}
        </div>

        {/* Mini listing chrome */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-2">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
            Blog
          </p>
          <div className="mb-2 flex flex-wrap gap-1">
            {showCategories ? (
              <>
                <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[8px] font-semibold text-[var(--color-button-foreground)]">
                  All
                </span>
                <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[8px] font-medium text-[var(--color-foreground)] ring-1 ring-[var(--color-border)]">
                  Spices
                </span>
              </>
            ) : null}
          </div>
          {showSearch ? (
            <div className="mb-2 h-6 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-[9px] leading-6 text-[var(--color-muted)]">
              Search…
            </div>
          ) : null}

          {showFeaturedPost && isList ? (
            <div className="mb-2 border-b border-[var(--color-border)] pb-2">
              <p className="mb-1 text-[8px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                Featured
              </p>
              <ListRowPreview
                title="Masala chai for monsoon evenings"
                showAuthor={showAuthor}
                showDate={showDate}
                showCategories={showCategories}
                larger
              />
            </div>
          ) : null}

          {isCover ? (
            <div className="blog-cover-card overflow-hidden rounded-lg">
              <div className="relative aspect-[3/4] max-h-44 overflow-hidden rounded-lg bg-[linear-gradient(145deg,#5c2a2a_0%,#2a1518_45%,#1a1012_100%)]">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--color-accent) 55%, transparent), transparent 55%)",
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 pt-10">
                  <p className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-white/70">
                    Sample
                  </p>
                  <h3 className="mt-0.5 text-xs font-semibold leading-snug text-white">
                    Masala chai for monsoon evenings
                  </h3>
                  <div className="mt-3 flex justify-center">
                    <CoverReadMoreBadge style={coverCtaStyle} compact />
                  </div>
                </div>
              </div>
            </div>
          ) : isList ? (
            <div className="space-y-2 divide-y divide-[var(--color-border)]">
              <ListRowPreview
                title="The magic of Indian masala"
                showAuthor={showAuthor}
                showDate={showDate}
                showCategories={showCategories}
              />
              <div className="pt-2">
                <ListRowPreview
                  title="Spice blends for everyday cooking"
                  showAuthor={showAuthor}
                  showDate={showDate}
                  showCategories={showCategories}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {["Masala chai nights", "Everyday spice tips"].map((title) => (
                <div
                  key={title}
                  className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-card)]"
                >
                  <div className="aspect-[16/10] bg-[linear-gradient(145deg,#5c2a2a,#1a1012)]" />
                  <div className="p-1.5">
                    <p className="line-clamp-2 text-[9px] font-semibold leading-snug text-[var(--color-foreground)]">
                      {title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[10px] leading-relaxed text-[var(--color-muted)]">
          {isList
            ? "List layout shows a small photo beside each article title — compact and easy to scan."
            : isCover
              ? "Cover cards use a tall image with the Read more badge. Switch layout to List for a tighter page."
              : "Grid shows articles as cards in columns."}
        </p>
        {(showCategories || showSearch) && (
          <p className="text-[10px] leading-relaxed text-[var(--color-muted)]">
            {[
              showCategories ? "Topic chips" : null,
              showSearch ? "Search" : null,
            ]
              .filter(Boolean)
              .join(" · ")}{" "}
            appear above the list.
          </p>
        )}
      </div>
    </aside>
  );
}

function ListRowPreview({
  title,
  showAuthor,
  showDate,
  showCategories,
  larger,
}: {
  title: string;
  showAuthor: boolean;
  showDate: boolean;
  showCategories: boolean;
  larger?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-2",
        larger ? "items-start" : "items-center",
      )}
    >
      <div
        className={cn(
          "shrink-0 rounded bg-[linear-gradient(145deg,#5c2a2a,#1a1012)]",
          larger ? "h-12 w-16" : "h-9 w-12",
        )}
      />
      <div className="min-w-0 flex-1">
        {(showCategories || showDate || showAuthor) && (
          <p className="mb-0.5 flex flex-wrap gap-x-1 text-[8px] text-[var(--color-muted)]">
            {showCategories ? (
              <span className="font-semibold uppercase text-[var(--color-primary)]">
                Spices
              </span>
            ) : null}
            {showDate ? <span>Mar 12</span> : null}
            {showAuthor ? <span>Team</span> : null}
          </p>
        )}
        <p
          className={cn(
            "font-semibold leading-snug text-[var(--color-foreground)]",
            larger ? "text-[11px]" : "text-[10px]",
          )}
        >
          {title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[8px] text-[var(--color-muted)]">
          A short excerpt preview for the listing…
        </p>
      </div>
    </div>
  );
}

export function BlogSettingsForm({
  initialValues,
  canUpdate,
  featuredOptions = [],
}: {
  initialValues: BlogSettingsFormValues;
  canUpdate: boolean;
  featuredOptions?: FeaturedOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listHref = getAdminPath("/content/blog");

  const {
    control,
    handleSubmit,
    reset,
    setError: setFieldError,
    setFocus,
    formState: { isDirty },
  } = useForm<BlogSettingsFormValues>({
    resolver: zodResolver(
      blogSettingsFormSchema,
    ) as Resolver<BlogSettingsFormValues>,
    defaultValues: {
      ...initialValues,
      pageTitle: "Blog",
    },
  });

  useEffect(() => {
    reset({ ...initialValues, pageTitle: "Blog" });
  }, [initialValues, reset]);

  const showFeaturedPost = useWatch({ control, name: "showFeaturedPost" });
  const cardStyle = useWatch({ control, name: "cardStyle" });
  const coverCtaStyle = useWatch({ control, name: "coverCtaStyle" });
  const layoutPreset = useWatch({ control, name: "layoutPreset" });
  const showCategories = useWatch({ control, name: "showCategories" });
  const showSearch = useWatch({ control, name: "showSearch" });
  const showAuthor = useWatch({ control, name: "showAuthor" });
  const showDate = useWatch({ control, name: "showDate" });
  const ctaTitle = useWatch({ control, name: "ctaTitle" });
  const ctaDescription = useWatch({ control, name: "ctaDescription" });
  const ctaButtonLabel = useWatch({ control, name: "ctaButtonLabel" });
  const ctaButtonHref = useWatch({ control, name: "ctaButtonHref" });
  const showCtaPreview = Boolean(
    ctaTitle || ctaDescription || ctaButtonLabel || ctaButtonHref,
  );
  const isList = layoutPreset === "LIST";
  const showCoverBadgePicker = !isList && cardStyle === "COVER";

  const save = handleSubmit((values) => {
    if (!canUpdate) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveBlogSettingsAction({
        ...values,
        pageTitle: "Blog",
      });
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
      setSuccess(result.message ?? "Saved.");
      reset({ ...values, pageTitle: "Blog" });
      router.refresh();
    });
  });

  return (
    <div className="w-full space-y-3 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={listHref}
          className="text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          ← Articles
        </Link>
        <p className="text-[11px] text-[var(--color-muted)]">
          Controls layout and extras on your store blog.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="space-y-3"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-start">
          <div className="space-y-3">
            <SettingsSection
              title="Listing page"
              hint="Intro under the Blog title, and how many articles load per page."
            >
              <div className={adminFieldsGrid(1)}>
                <Controller
                  name="pageDescription"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value ?? ""}
                      label="Intro text"
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      disabled={!canUpdate || pending}
                      helperText="Optional."
                    />
                  )}
                />
                <Controller
                  name="postsPerPage"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div>
                      <TextField
                        {...field}
                        type="number"
                        label="Articles per page"
                        fullWidth
                        size="small"
                        disabled={!canUpdate || pending}
                        error={Boolean(fieldState.error)}
                        helperText={
                          fieldState.error ? undefined : "Usually 6–12."
                        }
                      />
                      <FieldError message={fieldState.error?.message} />
                    </div>
                  )}
                />
              </div>
            </SettingsSection>

            <SettingsSection
              title="How articles look"
              hint="Pick list for a compact scan, or grid for larger cards."
            >
              <div className={adminFieldsGrid(1)}>
                <Controller
                  name="layoutPreset"
                  control={control}
                  render={({ field }) => (
                    <AdminSelect
                      label="Layout"
                      value={field.value === "LIST" ? "LIST" : "GRID"}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      options={[
                        {
                          value: "LIST",
                          label: "List — compact rows (recommended)",
                        },
                        { value: "GRID", label: "Grid — card columns" },
                      ]}
                    />
                  )}
                />
                {!isList ? (
                  <Controller
                    name="cardStyle"
                    control={control}
                    render={({ field }) => (
                      <AdminSelect
                        label="Card style"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={!canUpdate || pending}
                        options={[
                          { value: "STANDARD", label: "Standard" },
                          { value: "COVER", label: "Cover (tall image)" },
                          { value: "MINIMAL", label: "Minimal" },
                          { value: "EDITORIAL", label: "Editorial" },
                        ]}
                      />
                    )}
                  />
                ) : null}

                {showCoverBadgePicker ? (
                  <Controller
                    name="coverCtaStyle"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-[var(--color-foreground)]">
                          Read more badge
                        </p>
                        <p className="text-[10px] text-[var(--color-muted)]">
                          Only on Cover cards.
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                          {BLOG_COVER_CTA_STYLES.map((styleId) => {
                            const meta = COVER_CTA_STYLE_META[styleId];
                            const selected = field.value === styleId;
                            return (
                              <button
                                key={styleId}
                                type="button"
                                disabled={!canUpdate || pending}
                                onClick={() => field.onChange(styleId)}
                                className={cn(
                                  "relative flex flex-col items-center gap-1.5 rounded-lg border p-2 text-left transition",
                                  selected
                                    ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] ring-1 ring-[var(--color-primary)]"
                                    : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]",
                                  (!canUpdate || pending) &&
                                    "cursor-not-allowed opacity-60",
                                )}
                              >
                                {meta.premium ? (
                                  <span className="absolute right-1 top-1 rounded bg-[var(--color-primary)] px-1 py-px text-[0.5rem] font-semibold uppercase tracking-wide text-[var(--color-button-foreground)]">
                                    Pro
                                  </span>
                                ) : null}
                                <div className="flex h-11 w-full items-center justify-center rounded-md bg-[linear-gradient(145deg,#3a1a1e,#1a1012)]">
                                  <CoverReadMoreBadge
                                    style={styleId}
                                    compact
                                  />
                                </div>
                                <span className="w-full text-[0.65rem] font-semibold text-[var(--color-foreground)]">
                                  {meta.title}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  />
                ) : null}

                <Controller
                  name="showFeaturedPost"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      label="Highlight a featured article at the top"
                      variant="row"
                    />
                  )}
                />
                {showFeaturedPost ? (
                  <>
                    <Controller
                      name="featuredPostId"
                      control={control}
                      render={({ field, fieldState }) => (
                        <div>
                          <AdminSelect
                            label="Which article"
                            value={field.value ?? ""}
                            onChange={(next) => field.onChange(next || null)}
                            disabled={!canUpdate || pending}
                            allowEmpty
                            emptyLabel="Automatic"
                            error={Boolean(fieldState.error)}
                            helperText={
                              fieldState.error
                                ? undefined
                                : "Automatic picks a marked Featured post, or the latest."
                            }
                            options={featuredOptions.map((option) => ({
                              value: option.id,
                              label: option.title,
                            }))}
                          />
                          <FieldError message={fieldState.error?.message} />
                        </div>
                      )}
                    />
                    <Controller
                      name="autoFeaturedFallback"
                      control={control}
                      render={({ field }) => (
                        <AdminToggle
                          checked={Boolean(field.value)}
                          onChange={field.onChange}
                          disabled={!canUpdate || pending}
                          label="Fall back to latest if none is featured"
                          variant="row"
                        />
                      )}
                    />
                  </>
                ) : null}
              </div>
            </SettingsSection>

            <SettingsSection
              title="Find & filter"
              hint="Product-style Show filter on /blog, plus a left category rail."
            >
              <Controller
                name="showCategories"
                control={control}
                render={({ field }) => (
                  <AdminToggle
                    checked={Boolean(field.value)}
                    onChange={field.onChange}
                    disabled={!canUpdate || pending}
                    label="Show filter (product-style)"
                    variant="row"
                  />
                )}
              />
              <Controller
                name="showSearch"
                control={control}
                render={({ field }) => (
                  <AdminToggle
                    checked={Boolean(field.value)}
                    onChange={field.onChange}
                    disabled={!canUpdate || pending}
                    label="Search box"
                    variant="row"
                  />
                )}
              />
            </SettingsSection>

            <SettingsSection
              title="On each article"
              hint="Details on cards and full article pages."
            >
              <div className="grid gap-1 sm:grid-cols-2">
                {(
                  [
                    ["showAuthor", "Author name"],
                    ["showDate", "Publish date"],
                    ["showReadingTime", "Reading time"],
                    ["showFeaturedImage", "Cover photo"],
                    ["showShareButtons", "Share buttons"],
                    ["showRelatedPosts", "Related articles"],
                    ["showRelatedProducts", "Linked products"],
                  ] as const
                ).map(([name, label]) => (
                  <Controller
                    key={name}
                    name={name}
                    control={control}
                    render={({ field }) => (
                      <AdminToggle
                        checked={Boolean(field.value)}
                        onChange={field.onChange}
                        disabled={!canUpdate || pending}
                        label={label}
                        variant="row"
                      />
                    )}
                  />
                ))}
              </div>
            </SettingsSection>

            <SettingsSection
              title="End-of-article button"
              hint="Optional CTA after every story. Leave empty to hide."
            >
              <div className={adminFieldsGrid(2)}>
                <Controller
                  name="ctaTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value ?? ""}
                      label="Headline"
                      placeholder="Ready to cook?"
                      fullWidth
                      size="small"
                      disabled={!canUpdate || pending}
                    />
                  )}
                />
                <Controller
                  name="ctaButtonLabel"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value ?? ""}
                      label="Button text"
                      placeholder="Shop products"
                      fullWidth
                      size="small"
                      disabled={!canUpdate || pending}
                    />
                  )}
                />
                <Controller
                  name="ctaDescription"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value ?? ""}
                      label="Short message"
                      placeholder="Browse our spice range."
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      disabled={!canUpdate || pending}
                      className="sm:col-span-2"
                    />
                  )}
                />
                <div className="sm:col-span-2">
                  <Controller
                    name="ctaButtonHref"
                    control={control}
                    render={({ field, fieldState }) => (
                      <StorePageLinkField
                        label="Opens this page"
                        value={field.value}
                        allowEmpty
                        emptyLabel="No page (hidden until chosen)"
                        fallback="/products"
                        disabled={!canUpdate || pending}
                        error={Boolean(fieldState.error)}
                        helperText={
                          fieldState.error?.message ??
                          "Pick a store page — no need to type a link."
                        }
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
              <p className="text-[11px] text-[var(--color-muted)]">
                {showCtaPreview
                  ? "This block will show at the bottom of every article."
                  : "Hidden until you add a headline or button text."}
              </p>
            </SettingsSection>
          </div>

          <ListingLivePreview
            cardStyle={cardStyle ?? "STANDARD"}
            coverCtaStyle={(coverCtaStyle as BlogCoverCtaStyle) ?? "COOKIE"}
            layoutPreset={layoutPreset ?? "LIST"}
            showFeaturedPost={Boolean(showFeaturedPost)}
            showCategories={Boolean(showCategories)}
            showSearch={Boolean(showSearch)}
            showAuthor={Boolean(showAuthor)}
            showDate={Boolean(showDate)}
          />
        </div>

        <AdminSaveBar
          position="bottom"
          isDirty={isDirty}
          canUpdate={canUpdate}
          pending={pending}
          error={error}
          success={success}
          onSave={() => void save()}
          onCancel={() => {
            reset({ ...initialValues, pageTitle: "Blog" });
            setError(null);
            setSuccess(null);
            router.push(listHref);
          }}
        />
      </form>
    </div>
  );
}
