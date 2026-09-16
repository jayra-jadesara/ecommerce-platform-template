"use client";

import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import TravelExploreOutlinedIcon from "@mui/icons-material/TravelExploreOutlined";
import { zodResolver } from "@hookform/resolvers/zod";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import {
  createBlogPostAction,
  updateBlogPostAction,
} from "@/features/blog/actions";
import {
  MarkdownEditor,
  insertMarkdownImageAtCaret,
} from "@/features/editor";
import {
  blogPostFormSchema,
  type BlogPostFormValues,
} from "@/features/blog/schemas";
import type { BlogCategory, BlogProductOption } from "@/features/blog/types";
import { slugify } from "@/features/catalog/slug";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { MediaPicker } from "@/features/media";
import { AdminSeoFields } from "@/features/seo/components/AdminSeoFields";
import { AdminMultiSelect } from "@/features/admin/ui/AdminMultiSelect";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminFieldGroup,
  adminFormStack,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import {
  AdminDateTimeField,
  isoToAdminDateTimeLocal,
} from "@/features/admin/ui/AdminDateTimeField";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";

function plainTextFromMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function FormSectionTitle({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <p className="admin-field-group__title flex items-center gap-2">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
        {icon}
      </span>
      {children}
    </p>
  );
}

export function BlogPostForm({
  mode,
  postId,
  initialValues,
  categories,
  productOptions,
  canSubmit,
}: {
  mode: "create" | "edit";
  postId?: string;
  initialValues: BlogPostFormValues;
  categories: BlogCategory[];
  productOptions: BlogProductOption[];
  canSubmit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mediaOpen, setMediaOpen] = useState<"featured" | "content" | null>(
    null,
  );
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const listHref = getAdminPath("/content/blog");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError: setFieldError,
    setFocus,
    formState: { errors },
  } = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostFormSchema) as Resolver<BlogPostFormValues>,
    defaultValues: {
      ...initialValues,
      status: initialValues.status ?? "draft",
      publishedAt: initialValues.publishedAt
        ? isoToAdminDateTimeLocal(initialValues.publishedAt)
        : null,
    },
  });

  const title = useWatch({ control, name: "title" }) ?? "";
  const slug = useWatch({ control, name: "slug" }) ?? "";
  const excerpt = useWatch({ control, name: "excerpt" }) ?? "";
  const content = useWatch({ control, name: "content" }) ?? "";
  const seoTitle = useWatch({ control, name: "seoTitle" }) ?? "";
  const seoDescription = useWatch({ control, name: "seoDescription" }) ?? "";
  const featured = useWatch({ control, name: "featuredImagePath" });
  const status = useWatch({ control, name: "status" }) ?? "draft";
  const featuredPreview = resolveCmsImageUrl(featured);
  const postPath = slug ? `/blog/${slug}` : "/blog/…";
  const seoSourceDescription = useMemo(() => {
    const fromExcerpt = plainTextFromMarkdown(String(excerpt || ""));
    if (fromExcerpt) return fromExcerpt;
    return plainTextFromMarkdown(String(content || ""));
  }, [excerpt, content]);
  const productSelectOptions = useMemo(
    () => productOptions.map((p) => ({ id: p.id, label: p.name })),
    [productOptions],
  );

  useEffect(() => {
    const next = slugify(title);
    setValue("slug", next, { shouldValidate: Boolean(next), shouldDirty: true });
  }, [title, setValue]);

  function insertImageMarkdown(pathOrUrl: string, alt = "Image") {
    const url = resolveCmsImageUrl(pathOrUrl) ?? pathOrUrl;
    const { next, caret } = insertMarkdownImageAtCaret(
      String(content ?? ""),
      contentRef.current,
      url,
      alt,
    );
    setValue("content", next, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => {
      if (!contentRef.current) return;
      contentRef.current.focus();
      contentRef.current.setSelectionRange(caret, caret);
    });
  }

  function submitWithStatus(nextStatus: BlogPostFormValues["status"]) {
    setValue("status", nextStatus, { shouldDirty: true });
    void handleSubmit((values) => {
      if (!canSubmit) return;
      setError(null);
      const payload: BlogPostFormValues = {
        ...values,
        status: nextStatus,
        slug: slugify(values.title) || slugify(values.slug),
        ogImagePath: null,
        publishedAt: values.publishedAt || null,
      };
      if (!payload.slug) {
        setError("Add a title so we can create the article address.");
        return;
      }
      startTransition(async () => {
        const result =
          mode === "create"
            ? await createBlogPostAction(payload)
            : await updateBlogPostAction(postId!, payload);
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
        router.push(listHref);
        router.refresh();
      });
    })();
  }

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitWithStatus(status === "published" ? "published" : "draft");
        }}
        className="w-full"
        noValidate
      >
        {error ? (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="min-w-0 space-y-4">
            <section
              className={`${adminCard()} ${adminCardPadding()}`}
              style={adminStackStyle}
            >
              <div className={adminFieldGroup()} style={adminStackStyle}>
                <FormSectionTitle
                  icon={<ArticleOutlinedIcon sx={{ fontSize: 16 }} />}
                >
                  1. Article details
                </FormSectionTitle>
                <p className="admin-field-group__hint">
                  Give your post a clear name and a short summary for the blog
                  list.
                </p>
                <div>
                  <TextField
                    label="Article title"
                    fullWidth
                    required
                    disabled={!canSubmit || pending}
                    error={Boolean(errors.title)}
                    helperText={undefined}
                    {...register("title")}
                  />
                  <FieldError message={errors.title?.message} />
                </div>
                <div>
                  <TextField
                    label="Web address"
                    fullWidth
                    size="small"
                    required
                    disabled
                    error={Boolean(errors.slug)}
                    helperText={
                      errors.slug ? undefined : `Auto from title · ${postPath}`
                    }
                    value={slug}
                    name="slug"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <span className="mr-1 text-[var(--color-muted)]">
                            <LinkOutlinedIcon sx={{ fontSize: 16 }} />
                          </span>
                        ),
                      },
                    }}
                  />
                  <FieldError message={errors.slug?.message} />
                </div>
                <div>
                  <TextField
                    label="Short summary"
                    fullWidth
                    multiline
                    minRows={2}
                    disabled={!canSubmit || pending}
                    error={Boolean(errors.excerpt)}
                    helperText={
                      errors.excerpt
                        ? undefined
                        : "Optional. Shown on the blog list and in search results."
                    }
                    {...register("excerpt")}
                  />
                  <FieldError message={errors.excerpt?.message} />
                </div>
              </div>
            </section>

            <section
              className={`${adminCard()} ${adminCardPadding()}`}
              style={adminStackStyle}
            >
              <div className={adminFieldGroup()} style={adminStackStyle}>
                <FormSectionTitle
                  icon={<EditNoteOutlinedIcon sx={{ fontSize: 16 }} />}
                >
                  2. Write your article
                </FormSectionTitle>
                <p className="admin-field-group__hint">
                  Use the toolbar to format text. Switch to Preview anytime to
                  see how it will look on your store.
                </p>
                <Controller
                  name="content"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <MarkdownEditor
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        textareaRef={contentRef}
                        disabled={!canSubmit || pending}
                        error={Boolean(errors.content)}
                        helperText={undefined}
                        onRequestImage={() => setMediaOpen("content")}
                        placeholder={
                          "Write your article here…\n\nTip: select text, then tap Bold or Link."
                        }
                        previewEmptyHint="Nothing to preview yet. Switch to Write and add your story."
                      />
                      <FieldError message={errors.content?.message} />
                    </div>
                  )}
                />
              </div>
            </section>

            <section
              className={`${adminCard()} ${adminCardPadding()}`}
              style={adminStackStyle}
            >
              <div className={adminFieldGroup()} style={adminStackStyle}>
                <FormSectionTitle
                  icon={<ImageOutlinedIcon sx={{ fontSize: 16 }} />}
                >
                  3. Cover photo
                </FormSectionTitle>
                <p className="admin-field-group__hint">
                  Used on the article, blog list, and Google / social previews.
                </p>
                <ImagePickCard
                  path={featured}
                  previewUrl={featuredPreview}
                  disabled={!canSubmit || pending}
                  compact
                  onChoose={() => setMediaOpen("featured")}
                  onClear={() =>
                    setValue("featuredImagePath", null, { shouldDirty: true })
                  }
                />
              </div>
            </section>

            {productOptions.length > 0 ? (
              <section
                className={`${adminCard()} ${adminCardPadding()}`}
                style={adminStackStyle}
              >
                <div className={adminFieldGroup()} style={adminStackStyle}>
                  <FormSectionTitle
                    icon={<ShoppingBagOutlinedIcon sx={{ fontSize: 16 }} />}
                  >
                    4. Products to show with this article
                  </FormSectionTitle>
                  <p className="admin-field-group__hint">
                    Shoppers can open these from “Shop this article”. Optional.
                  </p>
                  <Controller
                    name="productIds"
                    control={control}
                    render={({ field }) => {
                      const selectedCount = (field.value ?? []).length;
                      return (
                        <AdminMultiSelect
                          options={productSelectOptions}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          disabled={!canSubmit || pending}
                          label="Products"
                          placeholder={
                            selectedCount
                              ? "Add another…"
                              : "Type a product name"
                          }
                          helperText={
                            selectedCount
                              ? `${selectedCount} product${selectedCount === 1 ? "" : "s"} linked`
                              : "Leave empty if none."
                          }
                        />
                      );
                    }}
                  />
                </div>
              </section>
            ) : null}

            <details className={`${adminCard()} ${adminCardPadding()}`}>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[var(--color-foreground)] [&::-webkit-details-marker]:hidden">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                  <TravelExploreOutlinedIcon sx={{ fontSize: 16 }} />
                </span>
                Search listing (Google) — optional
              </summary>
              <div className={`mt-3 ${adminFormStack()}`} style={adminStackStyle}>
                <AdminSeoFields
                  sourceTitle={title}
                  sourceDescription={seoSourceDescription}
                  seoTitle={String(seoTitle ?? "")}
                  seoDescription={String(seoDescription ?? "")}
                  onSeoTitleChange={(value) =>
                    setValue("seoTitle", value, { shouldDirty: true })
                  }
                  onSeoDescriptionChange={(value) =>
                    setValue("seoDescription", value, { shouldDirty: true })
                  }
                  previewUrl={
                    postPath.includes("…") ? "/blog/article" : postPath
                  }
                  disabled={!canSubmit || pending}
                  resetKey={postId ?? "new"}
                />
                <p className="text-xs text-[var(--color-muted)]">
                  Social and Google images use the cover photo above — no
                  separate upload needed.
                </p>
              </div>
            </details>
          </div>

          <aside className="lg:sticky lg:top-4">
            <section
              className={`${adminCard()} ${adminCardPadding()}`}
              style={adminStackStyle}
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                  <PublishOutlinedIcon sx={{ fontSize: 16 }} />
                </span>
                Ready to publish?
              </p>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <AdminSelect
                    label="Visibility"
                    disabled={!canSubmit || pending}
                    value={field.value ?? "draft"}
                    onChange={field.onChange}
                    name={field.name}
                    options={[
                      { value: "draft", label: "Draft (only you)" },
                      { value: "published", label: "Live on store" },
                      { value: "archived", label: "Archived" },
                    ]}
                  />
                )}
              />
              <Controller
                name="publishedAt"
                control={control}
                render={({ field }) => (
                  <AdminDateTimeField
                    label="Go live on"
                    disabled={!canSubmit || pending}
                    helperText="Leave empty to publish right away when you go live."
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                )}
              />
              <Controller
                name="isFeatured"
                control={control}
                render={({ field }) => (
                  <AdminToggle
                    variant="row"
                    checked={Boolean(field.value)}
                    onChange={field.onChange}
                    disabled={!canSubmit || pending}
                    label="Show as featured on the blog"
                  />
                )}
              />
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[var(--color-foreground)]">
                  <CategoryOutlinedIcon
                    sx={{ fontSize: 16 }}
                    className="text-[var(--color-muted)]"
                  />
                  Topics
                </p>
                <Controller
                  name="categoryIds"
                  control={control}
                  render={({ field }) => (
                    <FormGroup>
                      {categories.length === 0 ? (
                        <p className="text-sm text-[var(--color-muted)]">
                          No topics yet. Add some under Blog → Categories.
                        </p>
                      ) : (
                        categories.map((category) => {
                          const checked = (field.value ?? []).includes(
                            category.id,
                          );
                          return (
                            <FormControlLabel
                              key={category.id}
                              control={
                                <Checkbox
                                  checked={checked}
                                  disabled={!canSubmit || pending}
                                  onChange={(_, next) => {
                                    const current = field.value ?? [];
                                    field.onChange(
                                      next
                                        ? [...current, category.id]
                                        : current.filter(
                                            (id) => id !== category.id,
                                          ),
                                    );
                                  }}
                                />
                              }
                              label={category.name}
                            />
                          );
                        })
                      )}
                    </FormGroup>
                  )}
                />
              </div>
              <TextField
                label="Author name"
                fullWidth
                size="small"
                disabled={!canSubmit || pending}
                helperText="Shown on the article if author is enabled in Blog settings."
                slotProps={{
                  input: {
                    startAdornment: (
                      <span className="mr-1 text-[var(--color-muted)]">
                        <PersonOutlinedIcon sx={{ fontSize: 16 }} />
                      </span>
                    ),
                  },
                }}
                {...register("authorName")}
              />
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  disabled={!canSubmit || pending}
                  className={adminBtn("outline")}
                  onClick={() => submitWithStatus("draft")}
                >
                  {pending ? "Saving…" : "Save as draft"}
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || pending}
                  className={adminBtn("primary")}
                  onClick={() => submitWithStatus("published")}
                >
                  {pending ? "Publishing…" : "Publish now"}
                </button>
                <button
                  type="button"
                  className={adminBtn("ghost")}
                  onClick={() => router.push(listHref)}
                >
                  Cancel
                </button>
              </div>
            </section>
          </aside>
        </div>
      </form>

      <MediaPicker
        open={Boolean(mediaOpen)}
        folder="cms"
        onClose={() => setMediaOpen(null)}
        onSelect={(selection) => {
          if (mediaOpen === "featured") {
            setValue("featuredImagePath", selection.storagePath, {
              shouldDirty: true,
            });
          }
          if (mediaOpen === "content") {
            insertImageMarkdown(
              selection.publicUrl || selection.storagePath,
              selection.altText || "Image",
            );
          }
          setMediaOpen(null);
        }}
      />
    </>
  );
}

function ImagePickCard({
  path,
  previewUrl,
  disabled,
  onChoose,
  onClear,
  compact = false,
}: {
  path: string | null | undefined;
  previewUrl: string | null;
  disabled?: boolean;
  onChoose: () => void;
  onClear: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-3 ${
        compact ? "flex flex-wrap items-center gap-3" : ""
      }`}
      style={
        compact
          ? undefined
          : { display: "flex", flexDirection: "column", gap: "0.75rem" }
      }
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className={
            compact
              ? "h-20 w-28 shrink-0 rounded-lg object-cover"
              : "h-36 w-full rounded-lg object-cover"
          }
        />
      ) : (
        <p
          className={`text-sm text-[var(--color-muted)] ${
            compact ? "min-w-[7rem]" : ""
          }`}
        >
          No image selected
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          className={adminBtn("outline")}
          onClick={onChoose}
        >
          Choose image
        </button>
        {path ? (
          <button
            type="button"
            disabled={disabled}
            className={adminBtn("ghost")}
            onClick={onClear}
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
