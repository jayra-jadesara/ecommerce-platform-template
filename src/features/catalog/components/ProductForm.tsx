"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import {
  archiveProductAction,
  checkProductDependenciesAction,
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/features/catalog/actions";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import { FieldError } from "@/features/admin/ui/FieldError";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminFieldsGrid,
} from "@/features/admin/ui/admin-classes";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
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
import { AdminSeoFields } from "@/features/seo/components/AdminSeoFields";
import {
  resolveReturnPolicy,
  returnPolicyLabel,
  type ReturnPolicy,
} from "@/features/shipping/policies";
import { cn } from "@/lib/cn";

const STORE_DEFAULT_POLICY = "store_default";

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
  /** Store Delivery & returns default — products inherit this unless overridden. */
  storeReturnPolicy?: ReturnPolicy;
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
  action,
  children,
}: {
  step: number;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`${adminCard()} ${adminCardPadding()}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-button-background)] text-sm font-semibold text-[var(--color-button-foreground)]"
            aria-hidden
          >
            {step}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)]">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
              {description}
            </p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="admin-form-stack">{children}</div>
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
  storeReturnPolicy = "no_return_refund",
}: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");

  const listHref = getAdminPath("/catalog/products");
  const isView = mode === "view";
  const fieldsEditable = canUpdate && !isView;

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    setError: setFieldError,
    setFocus,
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
  const shortDescriptionWatch =
    useWatch({ control, name: "shortDescription" }) ?? "";
  const descriptionWatch = useWatch({ control, name: "description" }) ?? "";
  const seoTitleWatch = useWatch({ control, name: "seoTitle" }) ?? "";
  const seoDescriptionWatch = useWatch({ control, name: "seoDescription" }) ?? "";
  const slugWatch = useWatch({ control, name: "slug" }) ?? "";
  const seoSourceDescription =
    String(shortDescriptionWatch).trim() || String(descriptionWatch).trim();

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
        ...payload,
        slug,
        variants: payload.variants.map((variant) => {
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
      className="admin-form-stack pb-24"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-primary)_8%)] px-2 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:px-3 lg:left-[var(--admin-sidebar-width,15.5rem)]">
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
                    setError(null);
                    setDeleteOpen(true);
                    setDeleteBlocked(false);
                    setDeleteMessage(
                      "Delete this product? This action cannot be undone.",
                    );
                    startTransition(async () => {
                      const check = await checkProductDependenciesAction(
                        productId!,
                      );
                      if (!check.ok) {
                        setError(friendlyError(check.error));
                        setDeleteOpen(false);
                        return;
                      }
                      if (!check.deps.canDelete) {
                        setDeleteBlocked(true);
                        setDeleteMessage(check.deps.message);
                      }
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
        <ol className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">
          <li>1. Name the product and add a short description</li>
          <li>2. Set size, price, and stock</li>
          <li>3. Choose Draft or Active, then Save — photos come next</li>
        </ol>
      ) : null}

      <StepCard
        step={1}
        title="What are you selling?"
        description="Name, category, and what customers should know."
      >
        <div className={adminFieldsGrid(2) + " admin-fields-grid--2-md"}>
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <TextField
                  {...field}
                  label="Product name"
                  placeholder="e.g. Garam Masala"
                  fullWidth
                  required
                  disabled={!fieldsEditable}
                  error={Boolean(fieldState.error)}
                  helperText={undefined}
                  slotProps={{
                    htmlInput: {
                      "aria-invalid": Boolean(fieldState.error),
                      "aria-describedby": fieldState.error
                        ? "product-name-error"
                        : undefined,
                    },
                  }}
                  onChange={(event) => {
                    field.onChange(event);
                    syncAutoCodesFromName(event.target.value);
                  }}
                />
                <FieldError
                  id="product-name-error"
                  message={fieldState.error?.message}
                />
              </div>
            )}
          />
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <AdminSelect
                label="Category (product group)"
                disabled={!fieldsEditable}
                value={field.value ?? ""}
                onChange={(next) => field.onChange(next || null)}
                allowEmpty
                emptyLabel="No category"
                helperText="Optional. Groups this product for shopping (e.g. Spices, Snacks). Add groups under Products → Categories."
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
              />
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
            ? `Sizes / packs for “${productName}”.`
            : "Each size has its own price and stock."
        }
        action={
          <button
            type="button"
            disabled={!fieldsEditable}
            className={cn(adminBtn("outline"), "!min-h-9")}
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
          </button>
        }
      >
        <div className="space-y-3">
          {visibleVariants.map(({ field, index }) => {
            const variant = variants[index];
            if (!variant) return null;
            return (
              <div
                key={field.fieldId}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                  <div className="lg:col-span-4">
                    <Controller
                      name={`variants.${index}.name`}
                      control={control}
                      render={({ field: f, fieldState }) => (
                        <AdminSelect
                          label="Size / pack"
                          required
                          disabled={!fieldsEditable}
                          error={Boolean(fieldState.error)}
                          helperText={
                            fieldState.error?.message ??
                            "What customers pick at checkout"
                          }
                          value={f.value ?? ""}
                          onChange={f.onChange}
                          options={sizeMenuItems(f.value).map((option) => ({
                            value: option,
                            label: option,
                          }))}
                        />
                      )}
                    />
                  </div>
                  <div className="lg:col-span-2">
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
                  </div>
                  <div className="lg:col-span-2">
                    <Controller
                      name={`variants.${index}.quantity`}
                      control={control}
                      render={({ field: f, fieldState }) => (
                        <TextField
                          {...f}
                          size="small"
                          type="number"
                          label="Stock"
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
                  </div>
                  <div className="flex items-center lg:col-span-2 lg:pb-1">
                    <Controller
                      name={`variants.${index}.isActive`}
                      control={control}
                      render={({ field: f }) => (
                        <AdminToggle
                          checked={f.value}
                          disabled={!fieldsEditable}
                          label={f.value ? "On sale" : "Hidden"}
                          onChange={f.onChange}
                        />
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-end lg:col-span-2 lg:pb-1">
                    <button
                      type="button"
                      disabled={!fieldsEditable || visibleVariants.length <= 1}
                      className={cn(
                        adminBtn("ghost"),
                        "!min-h-9 text-[var(--color-error)] disabled:opacity-40",
                      )}
                      onClick={() =>
                        update(index, { ...variant, _delete: true })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </StepCard>

      <StepCard
        step={3}
        title="Show on your store?"
        description="Draft stays private. Active means customers can buy it."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <AdminSelect
                label="Status"
                required
                disabled={!fieldsEditable}
                value={field.value}
                onChange={field.onChange}
                name={field.name}
                options={[
                  { value: "draft", label: "Draft — not visible yet" },
                  { value: "active", label: "Active — for sale" },
                  { value: "archived", label: "Archived — hidden" },
                ]}
              />
            )}
          />
          <Controller
            name="featured"
            control={control}
            render={({ field }) => (
              <AdminToggle
                variant="row"
                checked={field.value}
                disabled={!fieldsEditable}
                label="Featured product"
                description="Show it in featured sections on the homepage."
                onChange={field.onChange}
              />
            )}
          />
          <div className="lg:col-span-2">
            <Controller
              name="returnPolicy"
              control={control}
              render={({ field }) => {
                const selectValue = field.value ?? STORE_DEFAULT_POLICY;
                const customersSee = returnPolicyLabel(
                  resolveReturnPolicy(field.value, storeReturnPolicy),
                );
                return (
                  <div className="space-y-2">
                    <AdminSelect
                      label="Return / replace policy"
                      disabled={!fieldsEditable}
                      value={selectValue}
                      onChange={(next) => {
                        field.onChange(
                          next === STORE_DEFAULT_POLICY
                            ? null
                            : (next as ReturnPolicy),
                        );
                      }}
                      helperText="Use store default to follow Delivery & returns. Override only when this product needs a different rule."
                      options={[
                        {
                          value: STORE_DEFAULT_POLICY,
                          label: `Use store default — ${returnPolicyLabel(storeReturnPolicy)}`,
                        },
                        {
                          value: "no_return_refund",
                          label: "No return / no refund",
                        },
                        { value: "no_replace", label: "No replace" },
                        { value: "replace_only", label: "Replace only" },
                      ]}
                    />
                    <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)]">
                      Customers see:{" "}
                      <span className="font-semibold">{customersSee}</span>
                    </p>
                  </div>
                );
              }}
            />
          </div>
        </div>
      </StepCard>

      {mode === "create" ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">
          After you save, you can upload product photos on the next screen.
        </p>
      ) : null}

      <details
        className={`${adminCard()} ${adminCardPadding()}`}
        open={showAdvanced}
        onToggle={(event) =>
          setShowAdvanced((event.target as HTMLDetailsElement).open)
        }
      >
        <summary className="cursor-pointer text-sm font-semibold text-[var(--color-foreground)]">
          Extra details (optional)
        </summary>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Brand, ingredients, shipping weight, and SEO.
        </p>
        <div className={`mt-4 ${adminFieldsGrid(2)}`}>
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
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-semibold text-[var(--color-foreground)]">
              Google &amp; SEO
            </p>
            <AdminSeoFields
              sourceTitle={productName}
              sourceDescription={seoSourceDescription}
              seoTitle={seoTitleWatch}
              seoDescription={seoDescriptionWatch}
              onSeoTitleChange={(value) =>
                setValue("seoTitle", value, { shouldDirty: true })
              }
              onSeoDescriptionChange={(value) =>
                setValue("seoDescription", value, { shouldDirty: true })
              }
              previewUrl={`/products/${slugWatch || "product-slug"}`}
              disabled={!fieldsEditable}
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
                  render={({ field: f }) => {
                    const unitOptions = [
                      ...PRODUCT_UNIT_OPTIONS.filter(Boolean).map((unit) => ({
                        value: unit,
                        label: unit,
                      })),
                      ...(f.value &&
                      !(PRODUCT_UNIT_OPTIONS as readonly string[]).includes(
                        f.value,
                      )
                        ? [{ value: f.value, label: f.value }]
                        : []),
                    ];
                    return (
                      <AdminSelect
                        label="Weight unit"
                        disabled={!fieldsEditable}
                        value={f.value ?? ""}
                        onChange={f.onChange}
                        allowEmpty
                        emptyLabel="Not set"
                        options={unitOptions}
                      />
                    );
                  }}
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
                    <AdminToggle
                      checked={f.value}
                      disabled={!fieldsEditable}
                      label="Track stock for this size"
                      onChange={f.onChange}
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

      <ConfirmDeleteDialog
        open={deleteOpen}
        title={
          deleteBlocked ? "Can't delete this product" : "Delete product?"
        }
        message={deleteMessage}
        blocked={deleteBlocked}
        warningTone={deleteBlocked}
        safeActionLabel="Archive"
        pending={pending}
        onClose={() => {
          if (pending) return;
          setDeleteOpen(false);
        }}
        onConfirm={() => {
          startTransition(async () => {
            const result = await deleteProductAction(productId!);
            if (!result.ok) {
              setError(friendlyError(result.error));
              setDeleteOpen(false);
              return;
            }
            setDeleteOpen(false);
            router.push(listHref);
          });
        }}
        onSafeAction={() => {
          startTransition(async () => {
            const result = await archiveProductAction(productId!);
            if (!result.ok) {
              setError(friendlyError(result.error));
              setDeleteOpen(false);
              return;
            }
            setSuccess("Product archived.");
            setDeleteOpen(false);
            router.push(listHref);
            router.refresh();
          });
        }}
      />
    </form>
  );
}
