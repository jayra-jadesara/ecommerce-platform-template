"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  AdminDragHandle,
  AdminSortableItem,
  AdminSortableList,
  arrayMove,
} from "@/features/admin/ui/AdminSortable";
import {
  createBlogCategoryAction,
  deleteBlogCategoryAction,
  reorderBlogCategoriesAction,
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
import { cn } from "@/lib/cn";

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
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [ordered, setOrdered] = useState(categories);
  const listHref = getAdminPath("/content/blog");

  useEffect(() => {
    setOrdered(categories);
  }, [categories]);

  const defaults = useMemo(() => {
    if (!editingId) {
      return {
        ...DEFAULT_BLOG_CATEGORY_FORM,
        sortOrder: categories.length,
      };
    }
    const row = categories.find((c) => c.id === editingId);
    if (!row) {
      return {
        ...DEFAULT_BLOG_CATEGORY_FORM,
        sortOrder: categories.length,
      };
    }
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
    formState: { errors },
  } = useForm<BlogCategoryFormValues>({
    resolver: zodResolver(
      blogCategoryFormSchema,
    ) as Resolver<BlogCategoryFormValues>,
    values: defaults,
  });

  const name = useWatch({ control, name: "name" }) ?? "";
  const slug = useWatch({ control, name: "slug" }) ?? "";
  const imagePath = useWatch({ control, name: "imagePath" });
  const imagePreview = resolveCmsImageUrl(imagePath);
  const canEditForm = editingId ? canUpdate : canCreate;

  useEffect(() => {
    const next = slugify(name);
    if (next === slug) return;
    setValue("slug", next, {
      shouldValidate: Boolean(name),
      shouldDirty: true,
    });
  }, [name, slug, setValue]);

  const onSubmit = handleSubmit((values) => {
    if (!canEditForm) return;
    setError(null);
    setSuccess(null);
    const payload: BlogCategoryFormValues = {
      ...values,
      slug: slugify(values.name),
      sortOrder: editingId
        ? (categories.find((c) => c.id === editingId)?.sortOrder ??
          values.sortOrder)
        : categories.length,
    };
    startTransition(async () => {
      const result = editingId
        ? await updateBlogCategoryAction(editingId, payload)
        : await createBlogCategoryAction(payload);
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
      reset({
        ...DEFAULT_BLOG_CATEGORY_FORM,
        sortOrder: categories.length + (editingId ? 0 : 1),
      });
      router.refresh();
    });
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={listHref}
          className="text-xs font-medium text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
        >
          ← Back to articles
        </Link>
        <p className="text-[11px] text-[var(--color-muted)]">
          Drag cards to set order on the store blog
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:items-start">
        <section
          className={cn(adminCard(), adminCardPadding(), "min-w-0 !p-3.5")}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
                {editingId ? "Edit category" : "New category"}
              </h2>
              <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-muted)]">
                Topics shoppers use to filter articles
              </p>
            </div>
            {editingId ? (
              <button
                type="button"
                className={cn(adminBtn("ghost"), "!px-2 !py-1 !text-xs")}
                onClick={() => {
                  setEditingId(null);
                  reset({
                    ...DEFAULT_BLOG_CATEGORY_FORM,
                    sortOrder: categories.length,
                  });
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>

          {error ? (
            <Alert severity="error" className="mb-2 !py-1.5 text-xs">
              {error}
            </Alert>
          ) : null}
          {success ? (
            <Alert severity="success" className="mb-2 !py-1.5 text-xs">
              {success}
            </Alert>
          ) : null}

          <form
            style={{ ...adminStackStyle, gap: "0.65rem" }}
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            <div
              className={adminFieldGroup()}
              style={{ ...adminStackStyle, gap: "0.55rem" }}
            >
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
                      size="small"
                      disabled={!canEditForm || pending}
                      error={Boolean(errors.name)}
                      placeholder="e.g. Recipes"
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
                      label="URL slug"
                      fullWidth
                      size="small"
                      disabled
                      error={Boolean(errors.slug)}
                      helperText={
                        field.value
                          ? `Auto from name · /blog?category=${field.value}`
                          : "Filled automatically from the name"
                      }
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
                    size="small"
                    multiline
                    minRows={2}
                    disabled={!canEditForm || pending}
                  />
                )}
              />
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <AdminToggle
                    checked={Boolean(field.value)}
                    onChange={field.onChange}
                    disabled={!canEditForm || pending}
                    label="Show on store"
                    variant="row"
                  />
                )}
              />
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-[var(--color-muted)]">
                  Image
                </p>
                <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-2">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt=""
                      className="h-12 w-16 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-[var(--color-card)] text-[10px] text-[var(--color-muted)]">
                      None
                    </div>
                  )}
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    <button
                      type="button"
                      className={cn(
                        adminBtn("outline"),
                        "!px-2 !py-1 !text-[11px]",
                      )}
                      disabled={!canEditForm || pending}
                      onClick={() => setMediaOpen(true)}
                    >
                      Choose
                    </button>
                    {imagePath ? (
                      <button
                        type="button"
                        className={cn(
                          adminBtn("ghost"),
                          "!px-2 !py-1 !text-[11px]",
                        )}
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
              className={cn(adminBtn("primary"), "!py-1.5 !text-xs")}
            >
              {pending
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Add category"}
            </button>
          </form>
        </section>

        <section
          className={cn(adminCard(), adminCardPadding(), "min-w-0 !p-3.5")}
        >
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
              Categories
            </h2>
            <span className="text-[11px] tabular-nums text-[var(--color-muted)]">
              {ordered.length}
            </span>
          </div>

          {ordered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-8 text-center">
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                No categories yet
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                Add one on the left to organize your journal.
              </p>
            </div>
          ) : (
            <AdminSortableList
              ids={ordered.map((c) => c.id)}
              disabled={!canUpdate || pending}
              layout="grid"
              as="div"
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
              onReorder={(activeId, overId) => {
                const oldIndex = ordered.findIndex((c) => c.id === activeId);
                const newIndex = ordered.findIndex((c) => c.id === overId);
                if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
                  return;
                }
                const next = arrayMove(ordered, oldIndex, newIndex);
                setOrdered(next);
                setError(null);
                startTransition(async () => {
                  const result = await reorderBlogCategoriesAction(
                    next.map((c) => c.id),
                  );
                  if (!result.ok) {
                    setError(result.error);
                    setOrdered(categories);
                    return;
                  }
                  setSuccess("Order saved.");
                  router.refresh();
                });
              }}
            >
              {ordered.map((category) => {
                const thumb = resolveCmsImageUrl(category.imagePath);
                return (
                  <AdminSortableItem
                    key={category.id}
                    id={category.id}
                    disabled={!canUpdate || pending}
                  >
                    {({
                      setNodeRef,
                      style,
                      isDragging,
                      attributes,
                      listeners,
                    }) => (
                      <article
                        ref={setNodeRef}
                        style={style}
                        className={cn(
                          "group flex flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] transition-shadow",
                          isDragging && "z-10 shadow-md ring-1 ring-[var(--color-primary)]/30",
                        )}
                      >
                        <div className="relative aspect-[16/9] bg-[var(--color-surface)]">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                              No image
                            </div>
                          )}
                          {canUpdate ? (
                            <div className="absolute left-1.5 top-1.5 rounded-md bg-[var(--color-card)]/95 shadow-sm">
                              <AdminDragHandle
                                disabled={pending}
                                attributes={attributes}
                                listeners={listeners}
                                className="!h-7 !w-7 !rounded-md"
                              />
                            </div>
                          ) : null}
                          <span
                            className={cn(
                              "absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                              category.isActive
                                ? "bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-card))] text-[var(--color-primary)]"
                                : "bg-[var(--color-surface)] text-[var(--color-muted)]",
                            )}
                          >
                            {category.isActive ? "On" : "Off"}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                              {category.name}
                            </p>
                            <p className="truncate text-[10px] text-[var(--color-muted)]">
                              /{category.slug}
                              {typeof category.postCount === "number"
                                ? ` · ${category.postCount} article${category.postCount === 1 ? "" : "s"}`
                                : null}
                            </p>
                          </div>
                          <div className="mt-auto flex flex-wrap gap-x-2.5 gap-y-1 border-t border-[var(--color-border)] pt-1.5 text-[11px]">
                            {canUpdate ? (
                              <>
                                <button
                                  type="button"
                                  className="font-medium text-[var(--color-foreground)] underline-offset-2 hover:underline"
                                  onClick={() => {
                                    setEditingId(category.id);
                                    setSuccess(null);
                                    setError(null);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
                                  disabled={pending}
                                  onClick={() => {
                                    setError(null);
                                    startTransition(async () => {
                                      const result =
                                        await updateBlogCategoryAction(
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
                                          ? "Hidden on store."
                                          : "Shown on store.",
                                      );
                                      router.refresh();
                                    });
                                  }}
                                >
                                  {category.isActive ? "Hide" : "Show"}
                                </button>
                              </>
                            ) : null}
                            {canDelete ? (
                              <button
                                type="button"
                                className="ml-auto text-red-700/90 underline-offset-2 hover:underline"
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
                        </div>
                      </article>
                    )}
                  </AdminSortableItem>
                );
              })}
            </AdminSortableList>
          )}
        </section>
      </div>

      <MediaPicker
        open={mediaOpen}
        folder="blog"
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
              reset({
                ...DEFAULT_BLOG_CATEGORY_FORM,
                sortOrder: Math.max(0, categories.length - 1),
              });
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
