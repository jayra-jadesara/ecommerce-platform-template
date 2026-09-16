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
  adminCardPadding,
  adminFieldGroup,
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
    <section
      className={`${adminCard()} ${adminCardPadding()}`}
      style={adminStackStyle}
    >
      <div className={adminFieldGroup()} style={adminStackStyle}>
        <div className="border-b border-[var(--color-border)] pb-3">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            {title}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-muted)]">
            {hint}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

function CoverCardLivePreview({
  cardStyle,
  coverCtaStyle,
  layoutPreset,
  showFeaturedPost,
}: {
  cardStyle: string;
  coverCtaStyle: BlogCoverCtaStyle;
  layoutPreset: string;
  showFeaturedPost: boolean;
}) {
  const isCover = cardStyle === "COVER";

  return (
    <aside className="lg:sticky lg:top-4">
      <div
        className={`${adminCard()} ${adminCardPadding()} space-y-3`}
        style={adminStackStyle}
      >
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Live preview
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Cover card · {layoutPreset === "LIST" ? "List" : "Grid"} layout
            {showFeaturedPost ? " · Featured on" : ""}
          </p>
        </div>

        <article className="blog-cover-card overflow-hidden rounded-[1.1rem]">
          <div className="blog-cover-card__surface relative aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-[linear-gradient(145deg,#5c2a2a_0%,#2a1518_45%,#1a1012_100%)]">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--color-accent) 55%, transparent), transparent 55%), radial-gradient(circle at 80% 70%, color-mix(in srgb, var(--color-primary) 40%, transparent), transparent 50%)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-16">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/70">
                Sample topic
              </p>
              <h3 className="mt-1 text-base font-semibold leading-snug text-white">
                Masala chai for monsoon evenings
              </h3>
              {isCover ? (
                <div className="mt-5 flex justify-center pb-1">
                  <CoverReadMoreBadge style={coverCtaStyle} compact />
                </div>
              ) : (
                <p className="mt-3 text-[0.7rem] text-white/75">
                  Badge shows when Card style is Cover.
                </p>
              )}
            </div>
          </div>
        </article>
      </div>
    </aside>
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
  const sidebarPreset = useWatch({ control, name: "sidebarPreset" });
  const cardStyle = useWatch({ control, name: "cardStyle" });
  const coverCtaStyle = useWatch({ control, name: "coverCtaStyle" });
  const layoutPreset = useWatch({ control, name: "layoutPreset" });
  const ctaTitle = useWatch({ control, name: "ctaTitle" });
  const ctaDescription = useWatch({ control, name: "ctaDescription" });
  const ctaButtonLabel = useWatch({ control, name: "ctaButtonLabel" });
  const ctaButtonHref = useWatch({ control, name: "ctaButtonHref" });
  const showCtaPreview = Boolean(
    ctaTitle || ctaDescription || ctaButtonLabel || ctaButtonHref,
  );

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
    <div className="w-full space-y-5 pb-4">
      <div className="space-y-1">
        <Link
          href={listHref}
          className="text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          ← Back to articles
        </Link>
        <p className="text-sm text-[var(--color-muted)]">
          Choose how shoppers see your blog listing and article pages.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="space-y-4"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
          <div className="space-y-4">
            <SettingsSection
              title="Listing page"
              hint="Intro text under “Blog” and how many stories load at once."
            >
              <div className={adminFieldsGrid(1)}>
                <Controller
                  name="pageDescription"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value ?? ""}
                      label="Intro under Blog"
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      disabled={!canUpdate || pending}
                      helperText="Optional. Shown on the store blog page."
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
              title="Card layout"
              hint="How article cards appear on the blog home."
            >
              <div className={adminFieldsGrid(1)}>
                <Controller
                  name="layoutPreset"
                  control={control}
                  render={({ field }) => (
                    <AdminSelect
                      label="Layout"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      options={[
                        { value: "GRID", label: "Grid of cards" },
                        { value: "LIST", label: "Simple list" },
                      ]}
                    />
                  )}
                />
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
                        { value: "COVER", label: "Cover (large image)" },
                        { value: "STANDARD", label: "Standard" },
                        { value: "MINIMAL", label: "Minimal" },
                        { value: "EDITORIAL", label: "Editorial" },
                      ]}
                    />
                  )}
                />

                <Controller
                  name="coverCtaStyle"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-[var(--color-foreground)]">
                        Read more badge
                      </p>
                      <p className="text-[0.6875rem] text-[var(--color-muted)]">
                        Only for Cover cards.
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                                "relative flex flex-col items-center gap-2 rounded-lg border p-2.5 text-left transition",
                                selected
                                  ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] ring-1 ring-[var(--color-primary)]"
                                  : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]",
                                (!canUpdate || pending) &&
                                  "cursor-not-allowed opacity-60",
                              )}
                            >
                              {meta.premium ? (
                                <span className="absolute right-1.5 top-1.5 rounded bg-[var(--color-primary)] px-1 py-px text-[0.55rem] font-semibold uppercase tracking-wide text-[var(--color-button-foreground)]">
                                  Premium
                                </span>
                              ) : null}
                              <div className="flex h-14 w-full items-center justify-center rounded-md bg-[linear-gradient(145deg,#3a1a1e,#1a1012)]">
                                <CoverReadMoreBadge
                                  style={styleId}
                                  compact
                                />
                              </div>
                              <span className="w-full text-[0.7rem] font-semibold text-[var(--color-foreground)]">
                                {meta.title}
                              </span>
                              <span className="w-full text-[0.62rem] leading-snug text-[var(--color-muted)]">
                                {meta.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                />

                <Controller
                  name="featuredPostId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div>
                      <AdminSelect
                        label="Featured article"
                        value={field.value ?? ""}
                        onChange={(next) => field.onChange(next || null)}
                        disabled={!canUpdate || pending || !showFeaturedPost}
                        allowEmpty
                        emptyLabel="Automatic"
                        error={Boolean(fieldState.error)}
                        helperText={
                          fieldState.error
                            ? undefined
                            : showFeaturedPost
                              ? "Automatic uses a marked Featured post or the latest one."
                              : "Turn on the highlight below first."
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
              </div>
              <Controller
                name="showFeaturedPost"
                control={control}
                render={({ field }) => (
                  <AdminToggle
                    checked={Boolean(field.value)}
                    onChange={field.onChange}
                    disabled={!canUpdate || pending}
                    label="Highlight a featured article"
                    variant="row"
                  />
                )}
              />
              {showFeaturedPost ? (
                <Controller
                  name="autoFeaturedFallback"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      label="Use latest article if none is featured"
                      variant="row"
                    />
                  )}
                />
              ) : null}
            </SettingsSection>

            <SettingsSection
              title="Search & topics"
              hint="Help shoppers find articles."
            >
              <Controller
                name="showCategories"
                control={control}
                render={({ field }) => (
                  <AdminToggle
                    checked={Boolean(field.value)}
                    onChange={field.onChange}
                    disabled={!canUpdate || pending}
                    label="Show topics"
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
                    label="Show search"
                    variant="row"
                  />
                )}
              />
              <Controller
                name="sidebarPreset"
                control={control}
                render={({ field }) => (
                  <AdminSelect
                    label="Topics placement (desktop)"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={!canUpdate || pending}
                    options={[
                      { value: "RIGHT", label: "Right side" },
                      { value: "LEFT", label: "Left side" },
                      { value: "TOP", label: "Above the list" },
                      { value: "NONE", label: "Hidden" },
                    ]}
                  />
                )}
              />
              {sidebarPreset !== "NONE" && sidebarPreset !== "TOP" ? (
                <Controller
                  name="showSidebar"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      label="Show side panel on desktop"
                      variant="row"
                    />
                  )}
                />
              ) : null}
            </SettingsSection>

            <SettingsSection
              title="On each article"
              hint="Details and extras shoppers see on cards and full articles."
            >
              <div className="space-y-2">
                <Controller
                  name="showAuthor"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      label="Author name"
                      variant="row"
                    />
                  )}
                />
                <Controller
                  name="showDate"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      label="Publish date"
                      variant="row"
                    />
                  )}
                />
                <Controller
                  name="showReadingTime"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      label="Reading time"
                      variant="row"
                    />
                  )}
                />
                <Controller
                  name="showFeaturedImage"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      label="Cover photo"
                      variant="row"
                    />
                  )}
                />
                <Controller
                  name="showShareButtons"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      label="Share buttons"
                      variant="row"
                    />
                  )}
                />
                <Controller
                  name="showRelatedPosts"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      label="Related articles"
                      variant="row"
                    />
                  )}
                />
                <Controller
                  name="showRelatedProducts"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending}
                      label="Linked products"
                      variant="row"
                    />
                  )}
                />
              </div>
            </SettingsSection>

            <SettingsSection
              title="End-of-article button"
              hint="Optional invite after every story (for example: Shop products). Leave empty to hide."
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
                      placeholder="Browse our spice range and cook along."
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
              <p className="text-xs text-[var(--color-muted)]">
                {showCtaPreview
                  ? "This button block will show at the bottom of every article."
                  : "Hidden until you add a headline or button text."}
              </p>
            </SettingsSection>
          </div>

          <CoverCardLivePreview
            cardStyle={cardStyle ?? "COVER"}
            coverCtaStyle={(coverCtaStyle as BlogCoverCtaStyle) ?? "COOKIE"}
            layoutPreset={layoutPreset ?? "GRID"}
            showFeaturedPost={Boolean(showFeaturedPost)}
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

      <div className="flex justify-end pb-2">
        <Link
          href="/blog"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Preview blog →
        </Link>
      </div>
    </div>
  );
}
