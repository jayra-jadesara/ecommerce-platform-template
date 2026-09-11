"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Autocomplete from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import {
  createBlogPostAction,
  updateBlogPostAction,
} from "@/features/blog/actions";
import {
  BlogMarkdownEditor,
  insertMarkdownImageAtCaret,
} from "@/features/blog/components/BlogMarkdownEditor";
import {
  blogPostFormSchema,
  type BlogPostFormValues,
} from "@/features/blog/schemas";
import type { BlogCategory, BlogProductOption } from "@/features/blog/types";
import { slugify } from "@/features/catalog/slug";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { MediaPicker } from "@/features/media";
import { AdminSeoFields } from "@/features/seo/components/AdminSeoFields";
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
  const [mediaOpen, setMediaOpen] = useState<"featured" | "content" | "og" | null>(
    null,
  );
  const [slugLockedToTitle, setSlugLockedToTitle] = useState(mode === "create");
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const listHref = getAdminPath("/content/blog");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
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

  const title = watch("title") ?? "";
  const slug = watch("slug") ?? "";
  const excerpt = watch("excerpt") ?? "";
  const content = watch("content") ?? "";
  const seoTitle = watch("seoTitle") ?? "";
  const seoDescription = watch("seoDescription") ?? "";
  const featured = watch("featuredImagePath");
  const og = watch("ogImagePath");
  const status = watch("status") ?? "draft";
  const featuredPreview = resolveCmsImageUrl(featured);
  const ogPreview = resolveCmsImageUrl(og);
  const postPath = slug ? `/blog/${slug}` : "/blog/…";

  useEffect(() => {
    if (!slugLockedToTitle) return;
    const next = slugify(title);
    setValue("slug", next, { shouldValidate: Boolean(next), shouldDirty: true });
  }, [title, slugLockedToTitle, setValue]);

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
        slug:
          mode === "create"
            ? slugify(values.slug || values.title) || slugify(values.title)
            : values.slug,
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
                <p className="admin-field-group__title">1. Article details</p>
                <p className="admin-field-group__hint">
                  Give your post a clear name and a short summary for the blog
                  list.
                </p>
                <TextField
                  label="Article title"
                  fullWidth
                  required
                  disabled={!canSubmit || pending}
                  error={Boolean(errors.title)}
                  helperText={errors.title?.message}
                  {...register("title")}
                />
                <TextField
                  label="Web address"
                  fullWidth
                  required
                  disabled={!canSubmit || pending}
                  error={Boolean(errors.slug)}
                  helperText={
                    errors.slug?.message ??
                    `Appears as ${postPath} on your store`
                  }
                  value={slug}
                  onChange={(event) => {
                    setSlugLockedToTitle(false);
                    setValue("slug", slugify(event.target.value), {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                />
                <TextField
                  label="Short summary"
                  fullWidth
                  multiline
                  minRows={2}
                  disabled={!canSubmit || pending}
                  error={Boolean(errors.excerpt)}
                  helperText={
                    errors.excerpt?.message ??
                    "Optional. Shown on the blog list and in search results."
                  }
                  {...register("excerpt")}
                />
              </div>
            </section>

            <section
              className={`${adminCard()} ${adminCardPadding()}`}
              style={adminStackStyle}
            >
              <div className={adminFieldGroup()} style={adminStackStyle}>
                <p className="admin-field-group__title">2. Write your article</p>
                <p className="admin-field-group__hint">
                  Use the toolbar to format text. Switch to Preview anytime to
                  see how it will look on your store.
                </p>
                <Controller
                  name="content"
                  control={control}
                  render={({ field }) => (
                    <BlogMarkdownEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      textareaRef={contentRef}
                      disabled={!canSubmit || pending}
                      error={Boolean(errors.content)}
                      helperText={errors.content?.message}
                      onRequestImage={() => setMediaOpen("content")}
                    />
                  )}
                />
              </div>
            </section>

            <section
              className={`${adminCard()} ${adminCardPadding()}`}
              style={adminStackStyle}
            >
              <div className={adminFieldGroup()} style={adminStackStyle}>
                <p className="admin-field-group__title">3. Cover photo</p>
                <p className="admin-field-group__hint">
                  Large image at the top of the article and on the blog list.
                </p>
                <ImagePickCard
                  path={featured}
                  previewUrl={featuredPreview}
                  disabled={!canSubmit || pending}
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
                  <p className="admin-field-group__title">
                    4. Products to show with this article
                  </p>
                  <p className="admin-field-group__hint">
                    Shoppers can open these from “Shop this article”. Pick as
                    many as you like.
                  </p>
                  <Controller
                    name="productIds"
                    control={control}
                    render={({ field }) => {
                      const selected = productOptions.filter((p) =>
                        (field.value ?? []).includes(p.id),
                      );
                      return (
                        <Autocomplete
                          multiple
                          disableCloseOnSelect
                          options={productOptions}
                          value={selected}
                          disabled={!canSubmit || pending}
                          getOptionLabel={(option) => option.name}
                          isOptionEqualToValue={(a, b) => a.id === b.id}
                          onChange={(_, next) =>
                            field.onChange(next.map((item) => item.id))
                          }
                          renderValue={(tagValue, getItemProps) =>
                            tagValue.map((option, index) => {
                              const { key, ...tagProps } = getItemProps({
                                index,
                              });
                              return (
                                <Chip
                                  key={key}
                                  label={option.name}
                                  size="small"
                                  {...tagProps}
                                />
                              );
                            })
                          }
                          renderOption={(props, option, { selected: on }) => {
                            const { key, ...optionProps } = props;
                            return (
                              <li key={key} {...optionProps}>
                                <Checkbox
                                  style={{ marginRight: 8 }}
                                  checked={on}
                                  size="small"
                                />
                                {option.name}
                              </li>
                            );
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Search and add products"
                              placeholder={
                                selected.length
                                  ? "Add another…"
                                  : "Type a product name"
                              }
                              helperText={
                                selected.length
                                  ? `${selected.length} product${selected.length === 1 ? "" : "s"} linked`
                                  : "Optional — leave empty if none."
                              }
                            />
                          )}
                        />
                      );
                    }}
                  />
                </div>
              </section>
            ) : null}

            <details className={`${adminCard()} ${adminCardPadding()}`}>
              <summary className="cursor-pointer text-sm font-semibold text-[var(--color-foreground)]">
                Search listing (Google)
              </summary>
              <div className={`mt-3 ${adminFormStack()}`} style={adminStackStyle}>
                <AdminSeoFields
                  sourceTitle={title}
                  sourceDescription={String(excerpt || content || "")}
                  seoTitle={String(seoTitle ?? "")}
                  seoDescription={String(seoDescription ?? "")}
                  onSeoTitleChange={(value) =>
                    setValue("seoTitle", value, { shouldDirty: true })
                  }
                  onSeoDescriptionChange={(value) =>
                    setValue("seoDescription", value, { shouldDirty: true })
                  }
                  previewUrl={postPath.includes("…") ? "/blog/article" : postPath}
                  disabled={!canSubmit || pending}
                  resetKey={postId ?? "new"}
                />
                <div>
                  <p className="mb-2 text-sm font-medium text-[var(--color-foreground)]">
                    Image for social sharing (optional)
                  </p>
                  <ImagePickCard
                    path={og}
                    previewUrl={ogPreview}
                    disabled={!canSubmit || pending}
                    onChoose={() => setMediaOpen("og")}
                    onClear={() =>
                      setValue("ogImagePath", null, { shouldDirty: true })
                    }
                  />
                </div>
              </div>
            </details>
          </div>

          <aside className="lg:sticky lg:top-4">
            <section
              className={`${adminCard()} ${adminCardPadding()}`}
              style={adminStackStyle}
            >
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                Ready to publish?
              </p>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Visibility"
                    fullWidth
                    disabled={!canSubmit || pending}
                    value={field.value ?? "draft"}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    inputRef={field.ref}
                  >
                    <MenuItem value="draft">Draft (only you)</MenuItem>
                    <MenuItem value="published">Live on store</MenuItem>
                    <MenuItem value="archived">Archived</MenuItem>
                  </TextField>
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
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(field.value)}
                        onChange={(_, checked) => field.onChange(checked)}
                        disabled={!canSubmit || pending}
                      />
                    }
                    label="Show as featured on the blog"
                  />
                )}
              />
              <div>
                <p className="mb-1 text-sm font-medium text-[var(--color-foreground)]">
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
                disabled={!canSubmit || pending}
                helperText="Shown on the article if author is enabled in Blog settings."
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
          if (mediaOpen === "og") {
            setValue("ogImagePath", selection.storagePath, {
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
}: {
  path: string | null | undefined;
  previewUrl: string | null;
  disabled?: boolean;
  onChoose: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-4"
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="h-36 w-full rounded-lg object-cover"
        />
      ) : (
        <p className="text-sm text-[var(--color-muted)]">No image selected</p>
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
