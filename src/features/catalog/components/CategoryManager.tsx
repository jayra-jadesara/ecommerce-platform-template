"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  AdminDragHandle,
  AdminSortableItem,
  AdminSortableList,
} from "@/features/admin/ui/AdminSortable";
import {
  archiveCategoryAction,
  checkCategoryDependenciesAction,
  createCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  updateCategoryAction,
} from "@/features/catalog/actions";
import type { CategoryRow } from "@/features/catalog/categories-service";
import { slugify } from "@/features/catalog/slug";
import {
  DEFAULT_CATEGORY_FORM,
  categoryFormSchema,
  type CategoryFormValues,
} from "@/features/catalog/validation";
import { MediaPicker } from "@/features/media/components/MediaPicker";
import { AdminSeoFields } from "@/features/seo/components/AdminSeoFields";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import { FieldError } from "@/features/admin/ui/FieldError";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import {
  adminBtn,
  adminCard,
  adminFieldGroup,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import { cn } from "@/lib/cn";

function CategoryImagePicker({
  disabled,
  onPick,
}: {
  disabled?: boolean;
  onPick: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={cn(adminBtn("outline"), "!min-h-8 !px-2.5 !text-xs")}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Choose
      </button>
      <MediaPicker
        open={open}
        folder="categories"
        onClose={() => setOpen(false)}
        onSelect={(selection) => onPick(selection.storagePath)}
      />
    </>
  );
}

interface CategoryManagerProps {
  initialCategories: CategoryRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function CategoryManager({
  initialCategories,
  canCreate,
  canUpdate,
  canDelete,
}: CategoryManagerProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteChecking, setDeleteChecking] = useState(false);

  const defaults = useMemo(() => {
    if (!editingId) return DEFAULT_CATEGORY_FORM;
    const row = initialCategories.find((c) => c.id === editingId);
    if (!row) return DEFAULT_CATEGORY_FORM;
    return {
      name: row.name,
      slug: row.slug,
      description: row.description ?? "",
      parentId: row.parent_id,
      imagePath: row.image_path ?? "",
      sortOrder: row.sort_order,
      isActive: row.is_active,
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
    } satisfies CategoryFormValues;
  }, [editingId, initialCategories]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError: setFieldError,
    setFocus,
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema) as Resolver<CategoryFormValues>,
    values: defaults,
  });

  const watchedSeoTitle = useWatch({ control, name: "seoTitle" }) ?? "";
  const watchedSeoDescription =
    useWatch({ control, name: "seoDescription" }) ?? "";
  const watchedName = useWatch({ control, name: "name" }) ?? "";
  const watchedDescription = useWatch({ control, name: "description" }) ?? "";
  const watchedSlug = useWatch({ control, name: "slug" }) ?? "";
  const canEditForm = editingId ? canUpdate : canCreate;

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = editingId
        ? await updateCategoryAction(editingId, values)
        : await createCategoryAction(values);
      if (!result.ok) {
        setError(result.error);
        const serverFieldErrors = resultFieldErrors(result);
        if (serverFieldErrors) {
          applyServerFieldErrors(setFieldError as never, serverFieldErrors);
          focusFirstFieldError({
            fieldErrors: serverFieldErrors,
            setFocus: setFocus as (name: string) => void,
          });
        }
        return;
      }
      setSuccess(result.message);
      setEditingId(null);
      reset(DEFAULT_CATEGORY_FORM);
      router.refresh();
    });
  });

  const parentOptions = initialCategories.filter(
    (category) => category.id !== editingId,
  );

  function startEdit(category: CategoryRow) {
    setEditingId(category.id);
    setSuccess(null);
    setError(null);
  }

  function reorderRows(activeId: string, overId: string) {
    const oldIndex = initialCategories.findIndex((c) => c.id === activeId);
    const newIndex = initialCategories.findIndex((c) => c.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const direction = newIndex > oldIndex ? "down" : "up";
    const steps = Math.abs(newIndex - oldIndex);
    setError(null);
    startTransition(async () => {
      for (let i = 0; i < steps; i += 1) {
        const result = await moveCategoryAction(activeId, direction);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      setSuccess("Order updated.");
      router.refresh();
    });
  }

  function hideCategory(category: CategoryRow) {
    startTransition(async () => {
      const result = await archiveCategoryAction(category.id);
      if (!result.ok) setError(result.error);
      else {
        setSuccess(result.message);
        router.refresh();
      }
    });
  }

  function requestDelete(category: CategoryRow) {
    setError(null);
    setDeleteTarget({ id: category.id, name: category.name });
    setDeleteBlocked(false);
    setDeleteMessage(`Delete “${category.name}”? This cannot be undone.`);
    setDeleteChecking(true);
    startTransition(async () => {
      const check = await checkCategoryDependenciesAction(category.id);
      setDeleteChecking(false);
      if (!check.ok) {
        setError(check.error);
        setDeleteTarget(null);
        return;
      }
      if (!check.deps.canDelete) {
        setDeleteBlocked(true);
        setDeleteMessage(check.deps.message);
      } else {
        setDeleteBlocked(false);
        setDeleteMessage(`Delete “${category.name}”? This cannot be undone.`);
      }
    });
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section className={cn(adminCard(), "min-w-0 p-4")}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
              {editingId ? "Edit category" : "New category"}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Name + short blurb. Google text stays automatic.
            </p>
          </div>
          {editingId ? (
            <button
              type="button"
              className={cn(adminBtn("ghost"), "!min-h-8 !px-2 !text-xs")}
              onClick={() => {
                setEditingId(null);
                reset(DEFAULT_CATEGORY_FORM);
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>

        {error ? (
          <Alert severity="error" className="mb-2 !py-1.5 text-sm">
            {error}
          </Alert>
        ) : null}
        {success ? (
          <Alert severity="success" className="mb-2 !py-1.5 text-sm">
            {success}
          </Alert>
        ) : null}

        <form
          style={{ ...adminStackStyle, gap: "0.75rem" }}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div
            className={adminFieldGroup(true)}
            style={{ ...adminStackStyle, gap: "0.65rem" }}
          >
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    size="small"
                    label="Name"
                    fullWidth
                    required
                    disabled={!canEditForm}
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error
                        ? undefined
                        : `/categories/${slugify(field.value) || "…"}`
                    }
                    slotProps={{
                      htmlInput: {
                        "aria-invalid": Boolean(fieldState.error),
                        "aria-describedby": fieldState.error
                          ? "category-name-error"
                          : undefined,
                      },
                    }}
                    onChange={(event) => {
                      field.onChange(event);
                      if (!editingId) {
                        setValue("slug", slugify(event.target.value), {
                          shouldValidate: true,
                        });
                      }
                    }}
                  />
                  <FieldError
                    id="category-name-error"
                    message={fieldState.error?.message}
                  />
                </div>
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Short description"
                  fullWidth
                  multiline
                  minRows={2}
                  disabled={!canEditForm}
                  helperText="Store page + Google description source"
                />
              )}
            />
          </div>

          <Controller
            name="imagePath"
            control={control}
            render={({ field, fieldState }) => {
              const preview =
                resolvePublicStorageUrl("categories", field.value) ??
                resolveCmsImageUrl(field.value);
              return (
                <div>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl border border-dashed bg-[var(--color-surface)] p-2",
                      fieldState.error
                        ? "border-[var(--color-error)]"
                        : "border-[var(--color-border)]",
                    )}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[9px] text-[var(--color-muted)]">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--color-foreground)]">
                        Image *
                      </p>
                      <p className="text-[11px] text-[var(--color-muted)]">
                        JPEG, PNG, or WebP
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <CategoryImagePicker
                        disabled={!canEditForm}
                        onPick={(path) =>
                          setValue("imagePath", path, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      />
                      {field.value ? (
                        <button
                          type="button"
                          className={cn(
                            adminBtn("ghost"),
                            "!min-h-8 !px-2 !text-xs",
                          )}
                          disabled={!canEditForm}
                          onClick={() =>
                            setValue("imagePath", "", {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <FieldError
                    id="category-image-error"
                    message={fieldState.error?.message}
                  />
                </div>
              );
            }}
          />

          <details className={adminFieldGroup(true)}>
            <summary className="cursor-pointer text-xs font-semibold text-[var(--color-foreground)]">
              More options
            </summary>
            <div
              className="mt-2"
              style={{ ...adminStackStyle, gap: "0.65rem" }}
            >
              <Controller
                name="parentId"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    size="small"
                    label="Parent"
                    fullWidth
                    disabled={!canEditForm}
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                  >
                    <MenuItem value="">None (top level)</MenuItem>
                    {parentOptions.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </div>
          </details>

          <details className={adminFieldGroup(true)}>
            <summary className="cursor-pointer text-xs font-semibold text-[var(--color-foreground)]">
              Google &amp; SEO (auto)
            </summary>
            <div className="mt-2">
              <AdminSeoFields
                resetKey={editingId ?? "new"}
                sourceTitle={watchedName}
                sourceDescription={watchedDescription}
                seoTitle={watchedSeoTitle}
                seoDescription={watchedSeoDescription}
                onSeoTitleChange={(value) =>
                  setValue("seoTitle", value, { shouldDirty: true })
                }
                onSeoDescriptionChange={(value) =>
                  setValue("seoDescription", value, { shouldDirty: true })
                }
                previewUrl={`/categories/${watchedSlug || "category-slug"}`}
                disabled={!canEditForm}
                forceAutomatic
              />
            </div>
          </details>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <AdminToggle
                checked={Boolean(field.value)}
                onChange={field.onChange}
                disabled={!canEditForm}
                label="Show on store"
                variant="row"
              />
            )}
          />

          <button
            type="submit"
            className={cn(adminBtn("primary"), "!min-h-9 !text-sm")}
            disabled={pending || !canEditForm}
          >
            {pending
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Create category"}
          </button>
        </form>
      </section>

      <section className={cn(adminCard(), "min-w-0 p-4")}>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
            Categories
          </h2>
          <p className="text-xs text-[var(--color-muted)]">
            {initialCategories.length}{" "}
            {initialCategories.length === 1 ? "category" : "categories"}
          </p>
        </div>

        {initialCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
            No categories yet. Create one to group products.
          </div>
        ) : (
          <>
            <div className="mb-2 hidden items-center gap-2 border-b border-[var(--color-border)] px-1 pb-2 text-[11px] uppercase tracking-wide text-[var(--color-muted)] md:grid md:grid-cols-[2rem_2.5rem_minmax(0,1fr)_7rem_7rem]">
              <span className="sr-only">Drag</span>
              <span>Img</span>
              <span>Name</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>
            <AdminSortableList
              ids={initialCategories.map((c) => c.id)}
              disabled={!canUpdate || pending}
              className="space-y-2 md:space-y-0"
              onReorder={reorderRows}
            >
              {initialCategories.map((category) => {
                const parent = initialCategories.find(
                  (item) => item.id === category.parent_id,
                );
                const preview =
                  resolvePublicStorageUrl("categories", category.image_path) ??
                  resolveCmsImageUrl(category.image_path);
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
                      <li
                        ref={setNodeRef}
                        style={style}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 md:grid md:grid-cols-[2rem_2.5rem_minmax(0,1fr)_7rem_7rem] md:gap-2 md:rounded-none md:border-0 md:border-b md:bg-transparent md:px-1 md:py-2 md:last:border-0",
                          isDragging && "z-10 opacity-90 shadow-md",
                        )}
                      >
                        <AdminDragHandle
                          disabled={!canUpdate || pending}
                          attributes={attributes}
                          listeners={listeners}
                          className="!h-9 !w-8 !self-center rounded-md"
                        />
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] md:h-9 md:w-9 md:rounded-md">
                          {preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={preview}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[9px] text-[var(--color-muted)]">
                              —
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--color-foreground)] md:font-medium">
                            {parent ? `${parent.name} / ` : null}
                            {category.name}
                          </p>
                          <p className="mt-1 md:mt-0">
                            <span className="md:hidden">
                              <AdminStatusBadge
                                tone={category.is_active ? "success" : "neutral"}
                              >
                                {category.is_active ? "Visible" : "Hidden"}
                              </AdminStatusBadge>
                            </span>
                            <span className="hidden truncate text-[11px] text-[var(--color-muted)] md:block">
                              /categories/{category.slug}
                            </span>
                          </p>
                        </div>
                        <div className="hidden md:block">
                          <AdminStatusBadge
                            tone={category.is_active ? "success" : "neutral"}
                          >
                            {category.is_active ? "Visible" : "Hidden"}
                          </AdminStatusBadge>
                        </div>
                        <div className="flex shrink-0 items-center justify-end">
                          <IconButton
                            size="small"
                            disabled={!canUpdate || pending}
                            aria-label={`Edit ${category.name}`}
                            onClick={() => startEdit(category)}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={
                              !canUpdate || !category.is_active || pending
                            }
                            aria-label={`Hide ${category.name}`}
                            onClick={() => hideCategory(category)}
                          >
                            <VisibilityOffOutlinedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!canDelete || pending || deleteChecking}
                            aria-label={`Delete ${category.name}`}
                            onClick={() => requestDelete(category)}
                          >
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </IconButton>
                        </div>
                      </li>
                    )}
                  </AdminSortableItem>
                );
              })}
            </AdminSortableList>
          </>
        )}
      </section>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title={
          deleteBlocked ? "Can't delete this category" : "Delete category?"
        }
        message={deleteMessage}
        blocked={deleteBlocked}
        warningTone={deleteBlocked}
        safeActionLabel="Deactivate"
        pending={pending || deleteChecking}
        onClose={() => {
          if (pending || deleteChecking) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteCategoryAction(deleteTarget.id);
            if (!result.ok) {
              setError(result.error);
              setDeleteTarget(null);
              return;
            }
            setSuccess(result.message);
            if (editingId === deleteTarget.id) setEditingId(null);
            setDeleteTarget(null);
            router.refresh();
          });
        }}
        onSafeAction={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await archiveCategoryAction(deleteTarget.id);
            if (!result.ok) {
              setError(result.error);
              setDeleteTarget(null);
              return;
            }
            setSuccess(result.message);
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
