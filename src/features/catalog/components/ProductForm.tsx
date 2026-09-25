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
  adminFieldsGrid,
} from "@/features/admin/ui/admin-classes";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import type { CategoryRow } from "@/features/catalog/categories-service";
import type { SizeOptionRow } from "@/features/catalog/size-options-service";
import { autoSkuFromSlug, slugify } from "@/features/catalog/slug";
import {
  DEFAULT_PRODUCT_FORM,
  emptyVariant,
  productFormSchema,
  type ProductFormValues,
} from "@/features/catalog/validation";
import { getAdminPath } from "@/config/admin-route";
import {
  resolveReturnPolicy,
  returnPolicyLabel,
  type ReturnPolicy,
} from "@/features/shipping/policies";
import { cn } from "@/lib/cn";
import type { ProductPageSettings } from "@/features/catalog/product-page-settings";
import {
  DEFAULT_PRODUCT_DETAIL_SECTIONS,
  DEFAULT_PRODUCT_FAQ_HEADING,
} from "@/features/catalog/product-page-settings";

const STORE_DEFAULT_POLICY = "store_default";

interface ProductFormProps {
  mode: "create" | "edit" | "view";
  productId?: string;
  initialValues?: ProductFormValues;
  categories: CategoryRow[];
  /** Active Size / pack master options for the variant dropdown. */
  sizeOptions?: SizeOptionRow[];
  canUpdate: boolean;
  canDelete: boolean;
  /** Store Delivery & returns default — products inherit this unless overridden. */
  storeReturnPolicy?: ReturnPolicy;
  /** Photos panel rendered as step 4 on edit/view (needs a saved product id). */
  imagesSlot?: ReactNode;
  /** After create — show CTA to set stock on Inventory. */
  showStockHint?: boolean;
  /** Store-wide PDP section headings + FAQ questions. */
  pageSettings?: ProductPageSettings;
}

function sizeSelectOptions(
  sizeOptions: SizeOptionRow[],
  current: string,
): { value: string; label: string }[] {
  const labels = sizeOptions.map((row) => row.label);
  const options = labels.map((label) => ({ value: label, label }));
  if (current && !labels.includes(current)) {
    options.unshift({ value: current, label: `${current} (current)` });
  }
  return options;
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
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cn(adminCard(), "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-button-background)] text-[11px] font-bold text-[var(--color-button-foreground)]"
            aria-hidden
          >
            {step}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
              {title}
            </h2>
            {description ? (
              <p className="text-[11px] leading-snug text-[var(--color-muted)]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="admin-form-stack admin-form-stack--compact p-3.5">
        {children}
      </div>
    </section>
  );
}

export function ProductForm({
  mode,
  productId,
  initialValues,
  categories,
  sizeOptions = [],
  canUpdate,
  canDelete,
  storeReturnPolicy = "no_return_refund",
  imagesSlot,
  showStockHint = false,
  pageSettings,
}: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const detailSections =
    pageSettings?.sections?.filter((s) => s.active) ??
    DEFAULT_PRODUCT_DETAIL_SECTIONS.filter((s) => s.active);
  const faqQuestions =
    pageSettings?.faqQuestions?.filter((q) => q.active) ?? [];
  const faqHeading = pageSettings?.faqHeading ?? DEFAULT_PRODUCT_FAQ_HEADING;
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
  const sectionContentWatch =
    useWatch({ control, name: "sectionContent" }) ?? {};
  const faqAnswersWatch = useWatch({ control, name: "faqAnswers" }) ?? {};
  const faqEnabledWatch = useWatch({ control, name: "faqEnabled" });

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
        // Stay on edit for photos; offer inventory deep-link via Set stock CTA.
        router.push(
          `${listHref}?panel=edit&id=${result.id}&stockHint=1`,
        );
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
      className="admin-form-stack admin-form-stack--compact pb-24"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-primary)_8%)] px-2 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:px-3 lg:left-[var(--admin-sidebar-width,16.75rem)]">
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

      {showStockHint && productId ? (
        <Alert
          severity="info"
          className="!rounded-xl"
          action={
            <Button
              color="inherit"
              size="small"
              href={getAdminPath(`/catalog/inventory?product=${productId}`)}
            >
              Set stock
            </Button>
          }
        >
          Product saved. Add photos here, or set how many you have in Inventory
          (stock starts at 0).
        </Alert>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {mode === "create" ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted)]">
          Fill basics → set price &amp; stock → choose status → Save. Photos come
          after save.
        </p>
      ) : null}

      <StepCard
        step={1}
        title="Basics"
        description="Name, category, short blurb, and detail sections"
      >
        <div className={adminFieldsGrid(2) + " admin-fields-grid--2-md"}>
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <TextField
                  {...field}
                  size="small"
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
                label="Category"
                disabled={!fieldsEditable}
                value={field.value ?? ""}
                onChange={(next) => field.onChange(next || null)}
                allowEmpty
                emptyLabel="No category"
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
                  size="small"
                  label="Short description"
                  placeholder="One line for product cards"
                  fullWidth
                  multiline
                  minRows={1}
                  disabled={!fieldsEditable}
                />
              )}
            />
          </div>
          {detailSections.map((section) => (
            <div key={section.id} className="md:col-span-2">
              <TextField
                size="small"
                label={section.heading}
                value={sectionContentWatch[section.id] ?? ""}
                onChange={(event) => {
                  setValue(
                    "sectionContent",
                    {
                      ...sectionContentWatch,
                      [section.id]: event.target.value,
                    },
                    { shouldDirty: true },
                  );
                }}
                placeholder={`Content for “${section.heading}”`}
                fullWidth
                multiline
                minRows={section.id === "description" ? 2 : 1}
                disabled={!fieldsEditable}
              />
            </div>
          ))}
        </div>
      </StepCard>

      <StepCard
        step={2}
        title={faqHeading.trim() || "FAQs"}
        description="Answers for store-wide FAQ questions (off by default on the store)"
      >
        <div className="space-y-4">
          <Controller
            name="faqEnabled"
            control={control}
            render={({ field }) => (
              <AdminToggle
                checked={Boolean(field.value)}
                disabled={!fieldsEditable}
                onChange={field.onChange}
                label="Show FAQs on store"
                description="Appears above Related products when answers are filled"
                variant="row"
              />
            )}
          />
          {faqEnabledWatch ? (
            faqQuestions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-4 text-[12px] text-[var(--color-muted)]">
                No FAQ questions configured yet. Add them under Catalog →
                Product settings → Product FAQs.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {faqQuestions.map((q, index) => (
                  <li
                    key={q.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_80%,var(--color-card))] p-3.5 sm:p-4"
                  >
                    <div className="mb-2.5 flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[11px] font-semibold text-[var(--color-primary)]"
                        aria-hidden
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                          Question
                        </p>
                        <p className="mt-0.5 text-[13px] font-medium leading-snug text-[var(--color-foreground)]">
                          {q.question}
                        </p>
                      </div>
                    </div>
                    <TextField
                      size="small"
                      label="Answer"
                      value={faqAnswersWatch[q.id] ?? ""}
                      onChange={(event) => {
                        setValue(
                          "faqAnswers",
                          {
                            ...faqAnswersWatch,
                            [q.id]: event.target.value,
                          },
                          { shouldDirty: true },
                        );
                      }}
                      fullWidth
                      multiline
                      minRows={3}
                      disabled={!fieldsEditable}
                      placeholder="Write the answer customers will see for this product"
                    />
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      </StepCard>

      <StepCard
        step={3}
        title="Price & sizes"
        description={
          productName
            ? `Packs for “${productName}” — size, sell price, and cost`
            : "Size, sell price, and your cost"
        }
        action={
          <button
            type="button"
            disabled={!fieldsEditable}
            className={cn(adminBtn("outline"), "!min-h-8 !px-2.5 !text-xs")}
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
            + Add size
          </button>
        }
      >
        <p className="mb-2 text-xs text-[var(--color-muted)]">
          Stock is managed under{" "}
          <a
            href={getAdminPath("/catalog/inventory")}
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            Products → Inventory
          </a>
          .
          {mode !== "create" && productId ? (
            <>
              {" "}
              <a
                href={getAdminPath(
                  `/catalog/inventory?product=${productId}`,
                )}
                className="font-medium text-[var(--color-primary)] hover:underline"
              >
                Set stock for this product
              </a>
              .
            </>
          ) : null}
        </p>
        <div className="space-y-2">
          {visibleVariants.map(({ field, index }) => {
            const variant = variants[index];
            if (!variant) return null;
            return (
              <div
                key={field.fieldId}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"
              >
                {(() => {
                  const sell = Number(variant.price) || 0;
                  const cost =
                    variant.costPrice == null
                      ? null
                      : Number(variant.costPrice);
                  const profit =
                    cost != null && !Number.isNaN(cost) ? sell - cost : null;
                  const margin =
                    profit != null && sell > 0
                      ? Math.round((profit / sell) * 100)
                      : null;
                  return (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-[10rem] flex-[1.4]">
                          <Controller
                            name={`variants.${index}.name`}
                            control={control}
                            render={({ field: f, fieldState }) => (
                              <AdminSelect
                                label="Size / pack"
                                required
                                disabled={!fieldsEditable}
                                error={Boolean(fieldState.error)}
                                helperText={fieldState.error?.message}
                                value={f.value ?? ""}
                                onChange={f.onChange}
                                options={sizeSelectOptions(
                                  sizeOptions,
                                  f.value ?? "",
                                )}
                                allowEmpty={sizeOptions.length === 0}
                                emptyLabel="Select size"
                              />
                            )}
                          />
                        </div>
                        <div className="w-[6.75rem] shrink-0">
                          <Controller
                            name={`variants.${index}.price`}
                            control={control}
                            render={({ field: f, fieldState }) => (
                              <TextField
                                {...f}
                                size="small"
                                type="number"
                                label="Sell price"
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
                        <div className="w-[6.75rem] shrink-0">
                          <Controller
                            name={`variants.${index}.costPrice`}
                            control={control}
                            render={({ field: f }) => (
                              <TextField
                                type="number"
                                label="Your cost"
                                size="small"
                                fullWidth
                                disabled={!fieldsEditable}
                                value={f.value ?? ""}
                                title="Private cost — used for profit"
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
                        </div>
                        <div className="flex h-10 shrink-0 items-center gap-1">
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
                          <button
                            type="button"
                            disabled={
                              !fieldsEditable || visibleVariants.length <= 1
                            }
                            className={cn(
                              adminBtn("ghost"),
                              "!min-h-8 !px-2 !text-xs text-[var(--color-error)] disabled:opacity-40",
                            )}
                            onClick={() =>
                              update(index, { ...variant, _delete: true })
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-snug text-[var(--color-muted)]">
                        {sizeOptions.length === 0 ? (
                          <span>
                            Add options under Products → Size / pack
                          </span>
                        ) : null}
                        {profit == null ? (
                          <span>Enter cost to see profit</span>
                        ) : (
                          <span
                            className={cn(
                              "font-semibold",
                              profit >= 0
                                ? "text-[var(--color-success)]"
                                : "text-[var(--color-error)]",
                            )}
                          >
                            Profit {profit >= 0 ? "" : "−"}
                            {Math.abs(profit).toFixed(0)}
                            {margin != null ? ` · ${margin}%` : ""}
                          </span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </StepCard>

      <StepCard
        step={4}
        title="Visibility"
        description="Draft is private. Active is for sale."
      >
        <div className="grid items-center gap-2 lg:grid-cols-2">
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
                  { value: "draft", label: "Draft — not visible" },
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
                className="!py-1.5"
                checked={field.value}
                disabled={!fieldsEditable}
                label="Featured"
                description="Show in homepage featured sections"
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <div className="mt-2">
            <Controller
              name="returnPolicy"
              control={control}
              render={({ field }) => {
                const selectValue = field.value ?? STORE_DEFAULT_POLICY;
                const customersSee = returnPolicyLabel(
                  resolveReturnPolicy(field.value, storeReturnPolicy),
                );
                return (
                  <div className="space-y-1.5">
                    <AdminSelect
                      label="Return / replace"
                      disabled={!fieldsEditable}
                      value={selectValue}
                      onChange={(next) => {
                        field.onChange(
                          next === STORE_DEFAULT_POLICY
                            ? null
                            : (next as ReturnPolicy),
                        );
                      }}
                      options={[
                        {
                          value: STORE_DEFAULT_POLICY,
                          label: `Store default — ${returnPolicyLabel(storeReturnPolicy)}`,
                        },
                        {
                          value: "no_return_refund",
                          label: "No return / no refund",
                        },
                        { value: "no_replace", label: "No replace" },
                        { value: "replace_only", label: "Replace only" },
                      ]}
                    />
                    <p className="text-[11px] text-[var(--color-muted)]">
                      Customers see:{" "}
                      <span className="font-semibold text-[var(--color-foreground)]">
                        {customersSee}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
        </div>
      </StepCard>

      {imagesSlot ? (
        <StepCard
          step={5}
          title="Photos"
          description="Shown on the product page and in listings"
        >
          {imagesSlot}
        </StepCard>
      ) : mode === "create" ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted)]">
          After save, upload photos in the Photos step on the edit screen.
        </p>
      ) : null}

      <details
        className={cn(adminCard(), "overflow-hidden")}
        open={showAdvanced}
        onToggle={(event) =>
          setShowAdvanced((event.target as HTMLDetailsElement).open)
        }
      >
        <summary className="cursor-pointer border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] px-3.5 py-2.5 text-sm font-semibold text-[var(--color-foreground)]">
          Extra details
          <span className="ml-1.5 text-[11px] font-normal text-[var(--color-muted)]">
            Brand
          </span>
        </summary>
        <div className={`p-3.5 ${adminFieldsGrid(2)}`}>
          <Controller
            name="brand"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Brand (optional)"
                placeholder="e.g. Nestlé, local mill name"
                fullWidth
                disabled={!fieldsEditable}
                helperText="Only if this product is from a named maker — leave blank for your own store brand. Google title and description are filled automatically from the product name and short description when you save."
              />
            )}
          />
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
