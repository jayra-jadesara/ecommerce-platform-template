"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import {
  archiveProductAction,
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/features/catalog/actions";
import type { CategoryRow } from "@/features/catalog/categories-service";
import { slugify } from "@/features/catalog/slug";
import {
  DEFAULT_PRODUCT_FORM,
  emptyVariant,
  productFormSchema,
  type ProductFormValues,
} from "@/features/catalog/validation";
import { getAdminPath } from "@/config/admin-route";

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initialValues?: ProductFormValues;
  categories: CategoryRow[];
  canUpdate: boolean;
  canDelete: boolean;
}

export function ProductForm({
  mode,
  productId,
  initialValues,
  categories,
  canUpdate,
  canDelete,
}: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as Resolver<ProductFormValues>,
    defaultValues: initialValues ?? DEFAULT_PRODUCT_FORM,
  });

  const { fields, append, update } = useFieldArray({
    control,
    name: "variants",
    keyName: "fieldId",
  });

  const variants = useWatch({ control, name: "variants" }) ?? [];

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProductAction(values)
          : await updateProductAction(productId!, values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      if (mode === "create" && result.id) {
        router.push(getAdminPath(`/catalog/products/${result.id}`));
        router.refresh();
        return;
      }
      router.refresh();
    });
  });

  const visibleVariants = fields
    .map((field, index) => ({ field, index }))
    .filter(({ index }) => !variants[index]?._delete);

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 py-3 backdrop-blur">
        {isDirty ? (
          <span className="text-sm text-amber-700">Unsaved changes</span>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          {mode === "edit" ? (
            <>
              <Button
                type="button"
                disabled={!canUpdate || pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await archiveProductAction(productId!);
                    if (!result.ok) setError(result.error);
                    else {
                      setSuccess(result.message);
                      router.refresh();
                    }
                  });
                }}
              >
                Archive
              </Button>
              <Button
                type="button"
                color="error"
                disabled={!canDelete || pending}
                onClick={() => {
                  if (!window.confirm("Delete this product permanently?")) return;
                  startTransition(async () => {
                    const result = await deleteProductAction(productId!);
                    if (!result.ok) setError(result.error);
                    else router.push(getAdminPath("/catalog/products"));
                  });
                }}
              >
                Delete
              </Button>
            </>
          ) : null}
          <Button
            type="submit"
            variant="contained"
            disabled={!canUpdate || pending}
          >
            {pending ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
          </Button>
        </div>
      </div>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <section className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-semibold">Basic information</h2>
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Name"
              fullWidth
              disabled={!canUpdate}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
              onChange={(event) => {
                field.onChange(event);
                if (mode === "create") {
                  setValue("slug", slugify(event.target.value), {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }
              }}
            />
          )}
        />
        <Controller
          name="slug"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Slug"
              fullWidth
              disabled={!canUpdate}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="brand"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Brand" fullWidth disabled={!canUpdate} />
          )}
        />
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <TextField
              select
              label="Category"
              fullWidth
              disabled={!canUpdate}
              value={field.value ?? ""}
              onChange={(event) => field.onChange(event.target.value || null)}
            >
              <MenuItem value="">Uncategorized</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label="Status" fullWidth disabled={!canUpdate}>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </TextField>
          )}
        />
        <Controller
          name="featured"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(_, checked) => field.onChange(checked)}
                  disabled={!canUpdate}
                />
              }
              label="Featured"
            />
          )}
        />
      </section>

      <section className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="font-semibold">Descriptions</h2>
        <Controller
          name="shortDescription"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Short description"
              fullWidth
              multiline
              minRows={2}
              disabled={!canUpdate}
            />
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Full description"
              fullWidth
              multiline
              minRows={5}
              disabled={!canUpdate}
              helperText="Plain text only. Safe rich text arrives with CMS tooling."
            />
          )}
        />
        <Controller
          name="ingredients"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Ingredients"
              fullWidth
              multiline
              minRows={3}
              disabled={!canUpdate}
            />
          )}
        />
        <Controller
          name="usageInstructions"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Usage instructions"
              fullWidth
              multiline
              minRows={3}
              disabled={!canUpdate}
            />
          )}
        />
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Variants & inventory</h2>
          <Button
            type="button"
            disabled={!canUpdate}
            onClick={() =>
              append(
                emptyVariant(`variant-${Math.random().toString(36).slice(2, 8)}`),
              )
            }
          >
            Add variant
          </Button>
        </div>
        {visibleVariants.map(({ field, index }) => {
          const variant = variants[index];
          if (!variant) return null;
          return (
            <div
              key={field.fieldId}
              className="grid gap-3 rounded-lg border border-[var(--color-border)] p-3 md:grid-cols-3"
            >
              <Controller
                name={`variants.${index}.name`}
                control={control}
                render={({ field: f, fieldState }) => (
                  <TextField
                    {...f}
                    label="Variant name"
                    fullWidth
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name={`variants.${index}.sku`}
                control={control}
                render={({ field: f, fieldState }) => (
                  <TextField
                    {...f}
                    label="SKU"
                    fullWidth
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name={`variants.${index}.price`}
                control={control}
                render={({ field: f, fieldState }) => (
                  <TextField
                    {...f}
                    type="number"
                    label="Price"
                    fullWidth
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    onChange={(event) =>
                      f.onChange(Number(event.target.value))
                    }
                  />
                )}
              />
              <Controller
                name={`variants.${index}.compareAtPrice`}
                control={control}
                render={({ field: f, fieldState }) => (
                  <TextField
                    type="number"
                    label="Compare-at price"
                    fullWidth
                    disabled={!canUpdate}
                    value={f.value ?? ""}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    onChange={(event) =>
                      f.onChange(
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                      )
                    }
                  />
                )}
              />
              <Controller
                name={`variants.${index}.costPrice`}
                control={control}
                render={({ field: f }) => (
                  <TextField
                    type="number"
                    label="Cost price"
                    fullWidth
                    disabled={!canUpdate}
                    value={f.value ?? ""}
                    onChange={(event) =>
                      f.onChange(
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                      )
                    }
                  />
                )}
              />
              <Controller
                name={`variants.${index}.weight`}
                control={control}
                render={({ field: f }) => (
                  <TextField
                    type="number"
                    label="Weight"
                    fullWidth
                    disabled={!canUpdate}
                    value={f.value ?? ""}
                    onChange={(event) =>
                      f.onChange(
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                      )
                    }
                  />
                )}
              />
              <Controller
                name={`variants.${index}.unit`}
                control={control}
                render={({ field: f }) => (
                  <TextField {...f} label="Unit" fullWidth disabled={!canUpdate} />
                )}
              />
              <Controller
                name={`variants.${index}.quantity`}
                control={control}
                render={({ field: f, fieldState }) => (
                  <TextField
                    {...f}
                    type="number"
                    label="Quantity"
                    fullWidth
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    onChange={(event) =>
                      f.onChange(Number(event.target.value) || 0)
                    }
                  />
                )}
              />
              <Controller
                name={`variants.${index}.reservedQuantity`}
                control={control}
                render={({ field: f, fieldState }) => (
                  <TextField
                    {...f}
                    type="number"
                    label="Reserved"
                    fullWidth
                    disabled={!canUpdate}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    onChange={(event) =>
                      f.onChange(Number(event.target.value) || 0)
                    }
                  />
                )}
              />
              <Controller
                name={`variants.${index}.lowStockThreshold`}
                control={control}
                render={({ field: f }) => (
                  <TextField
                    {...f}
                    type="number"
                    label="Low stock threshold"
                    fullWidth
                    disabled={!canUpdate}
                    onChange={(event) =>
                      f.onChange(Number(event.target.value) || 0)
                    }
                  />
                )}
              />
              <Controller
                name={`variants.${index}.trackInventory`}
                control={control}
                render={({ field: f }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={f.value}
                        onChange={(_, checked) => f.onChange(checked)}
                        disabled={!canUpdate}
                      />
                    }
                    label="Track inventory"
                  />
                )}
              />
              <Controller
                name={`variants.${index}.isActive`}
                control={control}
                render={({ field: f }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={f.value}
                        onChange={(_, checked) => f.onChange(checked)}
                        disabled={!canUpdate}
                      />
                    }
                    label="Active"
                  />
                )}
              />
              <div>
                <Button
                  type="button"
                  color="error"
                  disabled={!canUpdate || visibleVariants.length <= 1}
                  onClick={() => update(index, { ...variant, _delete: true })}
                >
                  Remove variant
                </Button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-semibold">SEO</h2>
        <Controller
          name="seoTitle"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="SEO title" fullWidth disabled={!canUpdate} />
          )}
        />
        <Controller
          name="seoDescription"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="SEO description"
              fullWidth
              multiline
              minRows={2}
              disabled={!canUpdate}
            />
          )}
        />
      </section>
    </form>
  );
}
