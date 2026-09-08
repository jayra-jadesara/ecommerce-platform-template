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
import { autoSkuFromSlug, slugify } from "@/features/catalog/slug";
import {
  DEFAULT_PRODUCT_FORM,
  emptyVariant,
  PRODUCT_SIZE_OPTIONS,
  PRODUCT_UNIT_OPTIONS,
  productFormSchema,
  type ProductFormValues,
} from "@/features/catalog/validation";
import { getAdminPath } from "@/config/admin-route";
import { GoogleSeoPreview } from "@/features/seo/components/GoogleSeoPreview";

function sizeMenuItems(current: string) {
  const options = PRODUCT_SIZE_OPTIONS as readonly string[];
  if (current && !options.includes(current)) {
    return [current, ...options];
  }
  return [...options];
}

interface ProductFormProps {
  mode: "create" | "edit" | "view";
  productId?: string;
  initialValues?: ProductFormValues;
  categories: CategoryRow[];
  canUpdate: boolean;
  canDelete: boolean;
}

function friendlyError(message: string) {
  if (/no active store/i.test(message)) {
    return "Your store isn't ready yet. Open Store Settings and finish setup, then try saving again.";
  }
  if (/permission/i.test(message)) {
    return "You don't have permission to perform this action.";
  }
  return message;
}

function StepCard({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:p-5">
      <div className="mb-4 flex gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-button-background)] text-sm font-semibold text-[var(--color-button-foreground)]"
          aria-hidden
        >
          {step}
        </span>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-[var(--color-muted)]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const listHref = getAdminPath("/catalog/products");
  const isView = mode === "view";
  const fieldsEditable = canUpdate && !isView;

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
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
  const productName = useWatch({ control, name: "name" }) ?? "";
  const seoTitleWatch = useWatch({ control, name: "seoTitle" }) ?? "";
  const seoDescriptionWatch = useWatch({ control, name: "seoDescription" }) ?? "";
  const slugWatch = useWatch({ control, name: "slug" }) ?? "";
  const previewOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://example.com";

  function syncAutoCodesFromName(name: string) {
    if (mode !== "create") return;
    const nextSlug = slugify(name);
    setValue("slug", nextSlug, { shouldValidate: true, shouldDirty: true });
    const current = getValues("variants") ?? [];
    let visibleIndex = 0;
    current.forEach((variant, index) => {
      if (variant._delete) return;
      setValue(
        `variants.${index}.sku`,
        autoSkuFromSlug(nextSlug, visibleIndex),
        { shouldValidate: true, shouldDirty: true },
      );
      visibleIndex += 1;
    });
  }

  const onSubmit = handleSubmit((values) => {
    if (isView) return;
    setError(null);
    setSuccess(null);

    let payload = values;
    if (mode === "create") {
      const slug = slugify(values.name);
      let visibleIndex = 0;
      payload = {
        ...values,
        slug,
        variants: values.variants.map((variant) => {
          if (variant._delete) return variant;
          const sku = autoSkuFromSlug(slug, visibleIndex);
          visibleIndex += 1;
          return { ...variant, sku };
        }),
      };
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProductAction(payload)
          : await updateProductAction(productId!, payload);
      if (!result.ok) {
        setError(friendlyError(result.error));
        return;
      }
      if (mode === "create" && result.id) {
        // Stay on edit so photos can be added, then return to list after next save.
        router.push(`${listHref}?panel=edit&id=${result.id}`);
        router.refresh();
        return;
      }
      router.push(listHref);
      router.refresh();
    });
  });

  const visibleVariants = fields
    .map((field, index) => ({ field, index }))
    .filter(({ index }) => !variants[index]?._delete);

  return (
    <form
      className="space-y-5 pb-24"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-primary)_8%)] px-2 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:px-3 lg:left-60 xl:left-64">
        <div className="flex w-full flex-wrap items-center gap-2">
          <Button type="button" href={listHref} size="small">
            ← Back to list
          </Button>
          {mode === "create" ? (
            <p className="text-sm text-[var(--color-muted)]">
              Save to continue with photos.
            </p>
          ) : isView ? (
            <p className="text-sm text-[var(--color-muted)]">View only</p>
          ) : isDirty ? (
            <span className="text-sm text-amber-700 dark:text-amber-400">
              Unsaved changes
            </span>
          ) : null}
          <div className="ml-auto flex flex-wrap gap-2">
            {mode === "edit" ? (
              <>
                <Button
                  type="button"
                  size="small"
                  disabled={!canUpdate || pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await archiveProductAction(productId!);
                      if (!result.ok) setError(friendlyError(result.error));
                      else {
                        setSuccess("Product archived.");
                        router.push(listHref);
                        router.refresh();
                      }
                    });
                  }}
                >
                  Archive
                </Button>
                <Button
                  type="button"
                  size="small"
                  color="error"
                  disabled={!canDelete || pending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Delete this product?\n\nThis action cannot be undone.",
                      )
                    ) {
                      return;
                    }
                    startTransition(async () => {
                      const result = await deleteProductAction(productId!);
                      if (!result.ok) setError(friendlyError(result.error));
                      else router.push(listHref);
                    });
                  }}
                >
                  Delete
                </Button>
              </>
            ) : null}
            {isView ? (
              canUpdate ? (
                <Button
                  type="button"
                  size="small"
                  variant="contained"
                  href={`${listHref}?panel=edit&id=${productId}`}
                >
                  Edit
                </Button>
              ) : null
            ) : (
              <Button
                type="submit"
                size="small"
                variant="contained"
                disabled={!fieldsEditable || pending}
              >
                {pending
                  ? "Saving…"
                  : mode === "create"
                    ? "Save product"
                    : "Save product"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {mode === "create" ? (
        <ol className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">
          <li>1. Name the product and add a short description</li>
          <li>2. Set the price and stock</li>
          <li>3. Choose Draft or Active</li>
          <li>4. Save — then add photos</li>
        </ol>
      ) : null}

      <StepCard
        step={1}
        title="What are you selling?"
        description="Name, category, and what customers should know."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Product name"
                placeholder="e.g. Garam Masala"
                fullWidth
                required
                disabled={!fieldsEditable}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                onChange={(event) => {
                  field.onChange(event);
                  syncAutoCodesFromName(event.target.value);
                }}
              />
            )}
          />
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Category (product group)"
                fullWidth
                disabled={!fieldsEditable}
                value={field.value ?? ""}
                onChange={(event) => field.onChange(event.target.value || null)}
                helperText="Optional. Groups this product for shopping (e.g. Spices, Snacks). Add groups under Products → Categories."
              >
                <MenuItem value="">No category</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <div className="md:col-span-2">
            <Controller
              name="shortDescription"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Short description"
                  placeholder="One or two lines for product cards"
                  fullWidth
                  multiline
                  minRows={2}
                  disabled={!fieldsEditable}
                />
              )}
            />
          </div>
          <div className="md:col-span-2">
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Full description"
                  placeholder="Tell customers about this product"
                  fullWidth
                  multiline
                  minRows={4}
                  disabled={!fieldsEditable}
                />
              )}
            />
          </div>
        </div>
      </StepCard>

      <StepCard
        step={2}
        title="Price & stock"
        description={
          productName
            ? `Add sizes or packs for “${productName}”.`
            : "Add sizes or packs with their own price and stock."
        }
      >
        <div className="mb-3 flex justify-end">
          <Button
            type="button"
            variant="outlined"
            disabled={!fieldsEditable}
            onClick={() => {
              const slug = getValues("slug") || slugify(getValues("name") || "");
              const nextIndex = visibleVariants.length;
              append({
                ...emptyVariant(
                  `variant-${Math.random().toString(36).slice(2, 8)}`,
                ),
                sku: autoSkuFromSlug(slug, nextIndex),
              });
            }}
          >
            + Add size / pack
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <tr>
                <th className="px-2 py-2">Size / pack</th>
                <th className="px-2 py-2">Price</th>
                <th className="px-2 py-2">Stock</th>
                <th className="px-2 py-2">On sale</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {visibleVariants.map(({ field, index }) => {
                const variant = variants[index];
                if (!variant) return null;
                return (
                  <tr
                    key={field.fieldId}
                    className="border-b border-[var(--color-border)] align-top last:border-0"
                  >
                    <td className="px-2 py-3 min-w-[10rem]">
                      <Controller
                        name={`variants.${index}.name`}
                        control={control}
                        render={({ field: f, fieldState }) => (
                          <TextField
                            {...f}
                            select
                            size="small"
                            label="Size / pack"
                            fullWidth
                            required
                            disabled={!fieldsEditable}
                            error={Boolean(fieldState.error)}
                            helperText={
                              fieldState.error?.message ??
                              "What customers pick at checkout"
                            }
                          >
                            {sizeMenuItems(f.value).map((option) => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </TextField>
                        )}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <Controller
                        name={`variants.${index}.price`}
                        control={control}
                        render={({ field: f, fieldState }) => (
                          <TextField
                            {...f}
                            size="small"
                            type="number"
                            label="Price"
                            fullWidth
                            required
                            disabled={!fieldsEditable}
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message}
                            onChange={(event) =>
                              f.onChange(Number(event.target.value))
                            }
                          />
                        )}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <Controller
                        name={`variants.${index}.quantity`}
                        control={control}
                        render={({ field: f, fieldState }) => (
                          <TextField
                            {...f}
                            size="small"
                            type="number"
                            label="How many in stock"
                            fullWidth
                            required
                            disabled={!fieldsEditable}
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message}
                            onChange={(event) =>
                              f.onChange(Number(event.target.value) || 0)
                            }
                          />
                        )}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <Controller
                        name={`variants.${index}.isActive`}
                        control={control}
                        render={({ field: f }) => (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={f.value}
                                onChange={(_, checked) => f.onChange(checked)}
                                disabled={!fieldsEditable}
                                size="small"
                              />
                            }
                            label={f.value ? "Yes" : "No"}
                          />
                        )}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <Button
                        type="button"
                        color="error"
                        size="small"
                        disabled={!fieldsEditable || visibleVariants.length <= 1}
                        onClick={() =>
                          update(index, { ...variant, _delete: true })
                        }
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </StepCard>

      <StepCard
        step={3}
        title="Show on your store?"
        description="Draft stays private. Active means customers can buy it."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Status"
                fullWidth
                required
                disabled={!fieldsEditable}
              >
                <MenuItem value="draft">Draft — not visible yet</MenuItem>
                <MenuItem value="active">Active — for sale</MenuItem>
                <MenuItem value="archived">Archived — hidden</MenuItem>
              </TextField>
            )}
          />
          <Controller
            name="featured"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                className="items-start rounded-lg border border-[var(--color-border)] px-3 py-2"
                control={
                  <Switch
                    checked={field.value}
                    onChange={(_, checked) => field.onChange(checked)}
                    disabled={!fieldsEditable}
                  />
                }
                label={
                  <span>
                    <span className="block font-medium">Featured product</span>
                    <span className="text-sm text-[var(--color-muted)]">
                      Show it in featured sections on the homepage.
                    </span>
                  </span>
                }
              />
            )}
          />
        </div>
      </StepCard>

      <StepCard
        step={4}
        title="Visual presentation"
        description="2D gallery is the default. Optional 3D uses a trusted GLB/GLTF storage path only."
      >
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Product photos are managed in the media panel after save. Leave the 3D
          path empty for a normal image gallery. Path format:{" "}
          <code className="text-xs">products/&#123;storeId&#125;/3d/file.glb</code>
        </p>
        <Controller
          name="modelPath"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              label="Optional 3D model path"
              fullWidth
              disabled={!fieldsEditable}
              value={field.value ?? ""}
              onChange={(event) =>
                field.onChange(event.target.value.trim() || null)
              }
              error={Boolean(fieldState.error)}
              helperText={
                fieldState.error?.message ||
                "No remote URLs. Upload a .glb/.gltf under your store’s products/…/3d/ folder, then paste the path."
              }
              placeholder="products/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/3d/model.glb"
            />
          )}
        />
      </StepCard>

      {mode === "create" ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">
          After you save, you can upload product photos on the next screen.
        </p>
      ) : null}

      <details
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
        open={showAdvanced}
        onToggle={(event) =>
          setShowAdvanced((event.target as HTMLDetailsElement).open)
        }
      >
        <summary className="cursor-pointer text-sm font-medium">
          Extra details (optional)
        </summary>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Brand, ingredients, shipping weight, and search listing text.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Controller
            name="brand"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Brand (who makes it)"
                placeholder="e.g. your brand name"
                fullWidth
                disabled={!fieldsEditable}
                helperText="Shown on the product page when filled in."
              />
            )}
          />
          <div className="md:col-span-2">
            <Controller
              name="ingredients"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="What's inside (ingredients)"
                  placeholder="List ingredients if this is food or cosmetics"
                  fullWidth
                  multiline
                  minRows={2}
                  disabled={!fieldsEditable}
                />
              )}
            />
          </div>
          <div className="md:col-span-2">
            <Controller
              name="usageInstructions"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="How customers should use it"
                  placeholder="Short tips or instructions"
                  fullWidth
                  multiline
                  minRows={2}
                  disabled={!fieldsEditable}
                />
              )}
            />
          </div>
          <Controller
            name="seoTitle"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="SEO title"
                fullWidth
                disabled={!fieldsEditable}
                helperText="Optional title for Google / search engines."
              />
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
                disabled={!fieldsEditable}
                helperText="Optional short blurb under the search title."
              />
            )}
          />
          <div className="md:col-span-2">
            <GoogleSeoPreview
              title={seoTitleWatch || productName}
              url={`${previewOrigin}/products/${slugWatch || "product-slug"}`}
              description={seoDescriptionWatch}
            />
          </div>
          {visibleVariants.map(({ field, index }) => {
            const variant = variants[index];
            if (!variant) return null;
            return (
              <div
                key={`extra-${field.fieldId}`}
                className="md:col-span-2 grid gap-3 rounded-lg border border-[var(--color-border)] p-3 md:grid-cols-3"
              >
                <p className="md:col-span-3 text-sm font-medium">
                  Pricing &amp; shipping — {variant.name || "pack"}
                </p>
                <Controller
                  name={`variants.${index}.compareAtPrice`}
                  control={control}
                  render={({ field: f }) => (
                    <TextField
                      type="number"
                      label="Was price (strikethrough)"
                      size="small"
                      fullWidth
                      disabled={!fieldsEditable}
                      value={f.value ?? ""}
                      helperText="Old price to show a discount"
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
                      label="Your cost (private)"
                      size="small"
                      fullWidth
                      disabled={!fieldsEditable}
                      value={f.value ?? ""}
                      helperText="Only for your records"
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
                      label="Shipping weight"
                      size="small"
                      fullWidth
                      disabled={!fieldsEditable}
                      value={f.value ?? ""}
                      helperText="Used for shipping rates"
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
                    <TextField
                      {...f}
                      select
                      size="small"
                      label="Weight unit"
                      fullWidth
                      disabled={!fieldsEditable}
                    >
                      <MenuItem value="">Not set</MenuItem>
                      {PRODUCT_UNIT_OPTIONS.filter(Boolean).map((unit) => (
                        <MenuItem key={unit} value={unit}>
                          {unit}
                        </MenuItem>
                      ))}
                      {f.value &&
                      !(PRODUCT_UNIT_OPTIONS as readonly string[]).includes(
                        f.value,
                      ) ? (
                        <MenuItem value={f.value}>{f.value}</MenuItem>
                      ) : null}
                    </TextField>
                  )}
                />
                <Controller
                  name={`variants.${index}.lowStockThreshold`}
                  control={control}
                  render={({ field: f }) => (
                    <TextField
                      {...f}
                      size="small"
                      type="number"
                      label="Warn when stock falls below"
                      fullWidth
                      disabled={!fieldsEditable}
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
                          disabled={!fieldsEditable}
                          size="small"
                        />
                      }
                      label="Track stock for this size"
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
                      label="Held for open orders"
                      size="small"
                      fullWidth
                      disabled={!fieldsEditable}
                      error={Boolean(fieldState.error)}
                      helperText={
                        fieldState.error?.message ?? "Usually leave at 0"
                      }
                      onChange={(event) =>
                        f.onChange(Number(event.target.value) || 0)
                      }
                    />
                  )}
                />
              </div>
            );
          })}
        </div>
      </details>
    </form>
  );
}
