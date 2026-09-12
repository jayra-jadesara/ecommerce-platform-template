"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import {
  archiveCategoryAction,
  checkCategoryDependenciesAction,
  createCategoryAction,
  deleteCategoryAction,
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
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminCardsGrid,
  adminFieldGroup,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";

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
        className={adminBtn("outline")}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Choose image
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
      imagePath: row.image_path,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
    } satisfies CategoryFormValues;
  }, [editingId, initialCategories]);

  const { control, handleSubmit, reset, setValue, setError: setFieldError, setFocus } =
    useForm<CategoryFormValues>({
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

  return (
    <div className={adminCardsGrid()}>
      <section className={`${adminCard()} ${adminCardPadding()} min-w-0`}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              {editingId ? "Edit category" : "Create category"}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              Groups products on your store. Google text fills in automatically.
            </p>
          </div>
          {editingId ? (
            <button
              type="button"
              className={adminBtn("ghost")}
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
            onSubmit();
          }}
        >
          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">1. Basics</p>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Category name"
                    fullWidth
                    required
                    disabled={!canEditForm}
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error
                        ? undefined
                        : editingId
                          ? undefined
                          : `Store address: /categories/${slugify(field.value) || "…"}`
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
                  label="Short description"
                  fullWidth
                  multiline
                  minRows={3}
                  disabled={!canEditForm}
                  helperText="Shown on the category page and used for Google text."
                />
              )}
            />
          </div>

          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">2. Image (optional)</p>
            <Controller
              name="imagePath"
              control={control}
              render={({ field }) => {
                const preview =
                  resolvePublicStorageUrl("categories", field.value) ??
                  resolveCmsImageUrl(field.value);
                return (
                  <div
                    className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt=""
                        className="h-36 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <p className="text-sm text-[var(--color-muted)]">
                        No image selected
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <CategoryImagePicker
                        disabled={!canEditForm}
                        onPick={(path) =>
                          setValue("imagePath", path, { shouldDirty: true })
                        }
                      />
                      {field.value ? (
                        <button
                          type="button"
                          className={adminBtn("ghost")}
                          disabled={!canEditForm}
                          onClick={() =>
                            setValue("imagePath", null, { shouldDirty: true })
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              }}
            />
          </div>

          <details className={adminFieldGroup()}>
            <summary className="cursor-pointer text-sm font-semibold text-[var(--color-foreground)]">
              More options
            </summary>
            <div className="mt-3" style={adminStackStyle}>
              <Controller
                name="parentId"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Parent category"
                    fullWidth
                    disabled={!canEditForm}
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                    helperText="Optional — nest under another category"
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
              <Controller
                name="sortOrder"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Display order"
                    fullWidth
                    disabled={!canEditForm}
                    helperText="Lower numbers appear first in lists"
                    onChange={(event) =>
                      field.onChange(Number(event.target.value) || 0)
                    }
                  />
                )}
              />
            </div>
          </details>

          <div className={adminFieldGroup()} style={adminStackStyle}>
            <p className="admin-field-group__title">3. Google &amp; SEO</p>
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
            />
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(_, checked) => field.onChange(checked)}
                    disabled={!canEditForm}
                  />
                }
                label="Show on store"
              />
            )}
          />

          <button
            type="submit"
            className={adminBtn("primary")}
            disabled={pending || !canEditForm}
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
          {initialCategories.length} categor
          {initialCategories.length === 1 ? "y" : "ies"}
        </p>

        {initialCategories.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center text-sm text-[var(--color-muted)]">
            No categories yet. Create the first one to organize products.
          </div>
        ) : (
          <ul
            className="mt-4"
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {initialCategories.map((category) => {
              const parent = initialCategories.find(
                (item) => item.id === category.parent_id,
              );
              const preview =
                resolvePublicStorageUrl("categories", category.image_path) ??
                resolveCmsImageUrl(category.image_path);
              return (
                <li
                  key={category.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-[var(--color-muted)]">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {parent ? `${parent.name} / ` : null}
                      {category.name}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      /categories/{category.slug}
                      {" · "}
                      {category.is_active ? "Visible" : "Hidden"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={adminBtn("outline")}
                      disabled={!canUpdate}
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
                      className={adminBtn("ghost")}
                      disabled={!canUpdate || !category.is_active}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await archiveCategoryAction(
                            category.id,
                          );
                          if (!result.ok) setError(result.error);
                          else {
                            setSuccess(result.message);
                            router.refresh();
                          }
                        });
                      }}
                    >
                      Hide
                    </button>
                    <button
                      type="button"
                      className={adminBtn("danger")}
                      disabled={!canDelete || pending || deleteChecking}
                      onClick={() => {
                        setError(null);
                        setDeleteTarget({
                          id: category.id,
                          name: category.name,
                        });
                        setDeleteBlocked(false);
                        setDeleteMessage(
                          `Delete “${category.name}”? This cannot be undone.`,
                        );
                        setDeleteChecking(true);
                        startTransition(async () => {
                          const check = await checkCategoryDependenciesAction(
                            category.id,
                          );
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
                            setDeleteMessage(
                              `Delete “${category.name}”? This cannot be undone.`,
                            );
                          }
                        });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title={
          deleteBlocked
            ? "Can't delete this category"
            : "Delete category?"
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
