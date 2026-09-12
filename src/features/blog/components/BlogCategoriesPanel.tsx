"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import {
  createBlogCategoryAction,
  deleteBlogCategoryAction,
  moveBlogCategoryAction,
  updateBlogCategoryAction,
} from "@/features/blog/actions";
import {
  DEFAULT_BLOG_CATEGORY_FORM,
  blogCategoryFormSchema,
  type BlogCategoryFormValues,
} from "@/features/blog/schemas";
import type { BlogCategory } from "@/features/blog/types";
import { slugify } from "@/features/catalog/slug";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { MediaPicker } from "@/features/media";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminCardsGrid,
  adminFieldGroup,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";

type CategoryRow = BlogCategory & { postCount?: number };

export function BlogCategoriesPanel({
  categories,
  canCreate,
  canUpdate,
  canDelete,
}: {
  categories: CategoryRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [slugLocked, setSlugLocked] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const listHref = getAdminPath("/content/blog");

  const defaults = useMemo(() => {
    if (!editingId) return DEFAULT_BLOG_CATEGORY_FORM;
    const row = categories.find((c) => c.id === editingId);
    if (!row) return DEFAULT_BLOG_CATEGORY_FORM;
    return {
      name: row.name,
      slug: row.slug,
      description: row.description,
      imagePath: row.imagePath,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    } satisfies BlogCategoryFormValues;
  }, [editingId, categories]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError: setFieldError,
    setFocus,
    watch,
    formState: { errors },
  } = useForm<BlogCategoryFormValues>({
    resolver: zodResolver(
      blogCategoryFormSchema,
    ) as Resolver<BlogCategoryFormValues>,
    values: defaults,
  });

  const name = watch("name") ?? "";
  const imagePath = watch("imagePath");
  const imagePreview = resolveCmsImageUrl(imagePath);
  const canEditForm = editingId ? canUpdate : canCreate;

  useEffect(() => {
    if (editingId || !slugLocked) return;
    setValue("slug", slugify(name), {
      shouldValidate: Boolean(name),
      shouldDirty: true,
    });
  }, [name, editingId, slugLocked, setValue]);

  const onSubmit = handleSubmit((values) => {
    if (!canEditForm) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = editingId
        ? await updateBlogCategoryAction(editingId, values)
        : await createBlogCategoryAction(values);
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
      setEditingId(null);
      setSlugLocked(true);
      reset(DEFAULT_BLOG_CATEGORY_FORM);
      router.refresh();
    });
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={listHref}
          className="text-sm font-medium underline underline-offset-2"
        >
          ← Back to articles
        </Link>
      </div>

      <div className={adminCardsGrid()}>
        <section className={`${adminCard()} ${adminCardPadding()} min-w-0`}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                {editingId ? "Edit category" : "Create category"}
              </h2>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                Group articles so shoppers can browse by topic.
              </p>
            </div>
            {editingId ? (
              <button
                type="button"
                className={adminBtn("ghost")}
                onClick={() => {
                  setEditingId(null);
                  setSlugLocked(true);
                  reset(DEFAULT_BLOG_CATEGORY_FORM);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>

          {error ? (
            <Alert severity="error" className="mb-3">
              {error}
            </Alert>
          ) : null}
          {success ? (
            <Alert severity="success" className="mb-3">
              {success}
            </Alert>
          ) : null}

          <form
            style={adminStackStyle}
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            <div className={adminFieldGroup()} style={adminStackStyle}>
              <p className="admin-field-group__title">Basics</p>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <div>
                    <TextField
                      {...field}
                      label="Name"
                      fullWidth
                      required
                      disabled={!canEditForm || pending}
                      error={Boolean(errors.name)}
                      helperText={undefined}
                    />
                    <FieldError message={errors.name?.message} />
                  </div>
                )}
              />
              <Controller
                name="slug"
                control={control}
                render={({ field }) => (
                  <div>
                    <TextField
                      {...field}
                      label="Slug"
                      fullWidth
                      required
                      disabled={!canEditForm || pending}
                      error={Boolean(errors.slug)}
                      helperText={undefined}
                      onChange={(event) => {
                        setSlugLocked(false);
                        field.onChange(slugify(event.target.value));
                      }}
                    />
                    <FieldError message={errors.slug?.message} />
                  </div>
                )}
              />
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label="Description"
                    fullWidth
                    multiline
                    minRows={2}
                    disabled={!canEditForm || pending}
                  />
                )}
              />
              <Controller
                name="sortOrder"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Sort order"
                    fullWidth
                    disabled={!canEditForm || pending}
                  />
                )}
              />
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(field.value)}
                        onChange={(_, checked) => field.onChange(checked)}
                        disabled={!canEditForm || pending}
                      />
                    }
                    label="Active"
                  />
                )}
              />
              <div>
                <p className="mb-2 text-sm font-medium">Image</p>
                <div
                  className="rounded-xl border border-dashed border-[var(--color-border)] p-4"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt=""
                      className="h-28 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <p className="text-sm text-[var(--color-muted)]">
                      No image selected
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={adminBtn("outline")}
                      disabled={!canEditForm || pending}
                      onClick={() => setMediaOpen(true)}
                    >
                      Choose image
                    </button>
                    {imagePath ? (
                      <button
                        type="button"
                        className={adminBtn("ghost")}
                        disabled={!canEditForm || pending}
                        onClick={() =>
                          setValue("imagePath", null, { shouldDirty: true })
                        }
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canEditForm || pending}
              className={adminBtn("primary")}
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Save category"
                  : "Create category"}
            </button>
          </form>
        </section>

        <section className={`${adminCard()} ${adminCardPadding()} min-w-0`}>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            Categories
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {categories.length} total
          </p>
          <ul className="mt-4 space-y-2">
            {categories.length === 0 ? (
              <li className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center">
                <p className="font-medium text-[var(--color-foreground)]">
                  No categories yet
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Add a category to help shoppers browse your journal.
                </p>
              </li>
            ) : (
              categories.map((category, index) => {
                const thumb = resolveCmsImageUrl(category.imagePath);
                return (
                <li
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-10 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-xs text-[var(--color-muted)]">
                        —
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{category.name}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {typeof category.postCount === "number"
                          ? `${category.postCount} article${category.postCount === 1 ? "" : "s"}`
                          : null}
                        {typeof category.postCount === "number" ? " · " : null}
                        {category.isActive ? "Active" : "Disabled"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canUpdate ? (
                      <>
                        <button
                          type="button"
                          className="underline disabled:opacity-40"
                          disabled={pending || index === 0}
                          aria-label={`Move ${category.name} up`}
                          onClick={() => {
                            setError(null);
                            startTransition(async () => {
                              const result = await moveBlogCategoryAction(
                                category.id,
                                "up",
                              );
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              setSuccess(result.message ?? "Reordered.");
                              router.refresh();
                            });
                          }}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="underline disabled:opacity-40"
                          disabled={
                            pending || index === categories.length - 1
                          }
                          aria-label={`Move ${category.name} down`}
                          onClick={() => {
                            setError(null);
                            startTransition(async () => {
                              const result = await moveBlogCategoryAction(
                                category.id,
                                "down",
                              );
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              setSuccess(result.message ?? "Reordered.");
                              router.refresh();
                            });
                          }}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className="underline"
                          onClick={() => {
                            setEditingId(category.id);
                            setSlugLocked(false);
                            setSuccess(null);
                            setError(null);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="underline"
                          disabled={pending}
                          onClick={() => {
                            setError(null);
                            startTransition(async () => {
                              const result = await updateBlogCategoryAction(
                                category.id,
                                {
                                  name: category.name,
                                  slug: category.slug,
                                  description: category.description,
                                  imagePath: category.imagePath,
                                  isActive: !category.isActive,
                                  sortOrder: category.sortOrder,
                                },
                              );
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              setSuccess(
                                category.isActive
                                  ? "Category disabled."
                                  : "Category enabled.",
                              );
                              router.refresh();
                            });
                          }}
                        >
                          {category.isActive ? "Disable" : "Enable"}
                        </button>
                      </>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        className="text-red-700 underline"
                        disabled={pending}
                        onClick={() => {
                          setError(null);
                          setDeleteTarget(category);
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </li>
                );
              })
            )}
          </ul>
        </section>
      </div>

      <MediaPicker
        open={mediaOpen}
        folder="cms"
        onClose={() => setMediaOpen(false)}
        onSelect={(selection) => {
          setValue("imagePath", selection.storagePath, { shouldDirty: true });
          setMediaOpen(false);
        }}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Delete category?"
        message={`Delete “${deleteTarget?.name ?? "this category"}”? Articles keep their other categories.`}
        pending={pending}
        onClose={() => {
          if (pending) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteBlogCategoryAction(deleteTarget.id);
            if (!result.ok) {
              setError(result.error);
              setDeleteTarget(null);
              return;
            }
            if (editingId === deleteTarget.id) {
              setEditingId(null);
              reset(DEFAULT_BLOG_CATEGORY_FORM);
            }
            setSuccess(result.message ?? "Deleted.");
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
