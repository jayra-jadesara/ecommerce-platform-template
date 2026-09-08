"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import {
  archiveCategoryAction,
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
      <Button
        type="button"
        size="small"
        variant="outlined"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Select from Media Library
      </Button>
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
    } satisfies CategoryFormValues;
  }, [editingId, initialCategories]);

  const { control, handleSubmit, reset, setValue } =
    useForm<CategoryFormValues>({
      resolver: zodResolver(categoryFormSchema) as Resolver<CategoryFormValues>,
      values: defaults,
    });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = editingId
        ? await updateCategoryAction(editingId, values)
        : await createCategoryAction(values);
      if (!result.ok) {
        setError(result.error);
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
    <div className="grid w-full min-w-0 gap-3 lg:grid-cols-2 lg:gap-4">
      <section className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">
            {editingId ? "Edit category" : "Create category"}
          </h2>
          {editingId ? (
            <Button
              type="button"
              size="small"
              onClick={() => {
                setEditingId(null);
                reset(DEFAULT_CATEGORY_FORM);
              }}
            >
              Cancel edit
            </Button>
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
          className="space-y-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                size="small"
                label="Name"
                fullWidth
                required
                disabled={!(editingId ? canUpdate : canCreate)}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                onChange={(event) => {
                  field.onChange(event);
                  if (!editingId) {
                    setValue("slug", slugify(event.target.value), {
                      shouldValidate: true,
                    });
                  }
                }}
              />
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Description"
                fullWidth
                multiline
                minRows={2}
                disabled={!(editingId ? canUpdate : canCreate)}
              />
            )}
          />
          <details className="rounded-lg border border-[var(--color-border)] p-3">
            <summary className="cursor-pointer text-sm font-medium">
              More options
            </summary>
            <div className="mt-3 space-y-2.5">
              <Controller
                name="parentId"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    size="small"
                    label="Parent category"
                    fullWidth
                    disabled={!(editingId ? canUpdate : canCreate)}
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
              <Controller
                name="sortOrder"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    size="small"
                    type="number"
                    label="Sort order"
                    fullWidth
                    disabled={!(editingId ? canUpdate : canCreate)}
                    onChange={(event) =>
                      field.onChange(Number(event.target.value) || 0)
                    }
                  />
                )}
              />
              <Controller
                name="imagePath"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <TextField
                      {...field}
                      size="small"
                      value={field.value ?? ""}
                      label="Image (optional)"
                      fullWidth
                      disabled={!(editingId ? canUpdate : canCreate)}
                      helperText="Pick from Media Library or leave empty."
                      onChange={(event) =>
                        field.onChange(event.target.value || null)
                      }
                    />
                    <CategoryImagePicker
                      disabled={!(editingId ? canUpdate : canCreate)}
                      onPick={(path) =>
                        setValue("imagePath", path, { shouldDirty: true })
                      }
                    />
                  </div>
                )}
              />
            </div>
          </details>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(_, checked) => field.onChange(checked)}
                    disabled={!(editingId ? canUpdate : canCreate)}
                  />
                }
                label="Active"
              />
            )}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={pending || !(editingId ? canUpdate : canCreate)}
          >
            {pending ? "Saving…" : editingId ? "Save changes" : "Create category"}
          </Button>
        </form>
      </section>

      <section className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
        <h2 className="mb-3 font-semibold">Categories</h2>
        {initialCategories.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            No categories yet. Create the first one to organize products.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {initialCategories.map((category) => {
              const parent = initialCategories.find(
                (item) => item.id === category.parent_id,
              );
              return (
                <li
                  key={category.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {parent ? `${parent.name} / ` : null}
                      {category.name}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      /{category.slug} · sort {category.sort_order} ·{" "}
                      {category.is_active ? "active" : "inactive"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="small"
                      disabled={!canUpdate}
                      onClick={() => {
                        setEditingId(category.id);
                        setSuccess(null);
                        setError(null);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
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
                      Deactivate
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      disabled={!canDelete}
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Delete this category? This is blocked if products or children still reference it.",
                          )
                        ) {
                          return;
                        }
                        startTransition(async () => {
                          const result = await deleteCategoryAction(
                            category.id,
                          );
                          if (!result.ok) setError(result.error);
                          else {
                            setSuccess(result.message);
                            if (editingId === category.id) setEditingId(null);
                            router.refresh();
                          }
                        });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
