"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import TextField from "@mui/material/TextField";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import {
  createCouponAction,
  updateCouponAction,
} from "@/features/coupons/actions";
import {
  couponFormSchema,
  type CouponFormValues,
} from "@/features/coupons/schemas";
import { formatMoney } from "@/features/catalog/money";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminFieldsGrid,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import {
  AdminDateTimeField,
  isoToAdminDateTimeLocal,
} from "@/features/admin/ui/AdminDateTimeField";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { MediaPicker } from "@/features/media";

interface CouponFormProps {
  mode: "create" | "edit";
  couponId?: string;
  initialValues: CouponFormValues;
  currency: string;
  canSubmit: boolean;
}

function SectionCard({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className={`${adminCard()} ${adminCardPadding()}`}>
      <header className="mb-4 border-b border-[var(--color-border)] pb-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
          {step}
        </p>
        <h2 className="mt-1 text-base font-semibold text-[var(--color-foreground)]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{hint}</p>
      </header>
      <div style={adminStackStyle}>{children}</div>
    </section>
  );
}

export function CouponForm({
  mode,
  couponId,
  initialValues,
  currency,
  canSubmit,
}: CouponFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mediaOpen, setMediaOpen] = useState(false);
  const listHref = getAdminPath("/settings/coupons");

  const {
    register,
    control,
    handleSubmit,
    setError: setFieldError,
    setFocus,
    setValue,
    formState: { errors },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema) as Resolver<CouponFormValues>,
    defaultValues: {
      ...initialValues,
      discountType:
        initialValues.discountType === "percentage" ||
        initialValues.discountType === "fixed"
          ? initialValues.discountType
          : "percentage",
      startsAt: initialValues.startsAt
        ? isoToAdminDateTimeLocal(initialValues.startsAt)
        : null,
      expiresAt: initialValues.expiresAt
        ? isoToAdminDateTimeLocal(initialValues.expiresAt)
        : null,
      showOnStorefront: Boolean(initialValues.showOnStorefront),
      promoHeadline: initialValues.promoHeadline ?? null,
      promoSubtext: initialValues.promoSubtext ?? null,
      promoImageUrl: initialValues.promoImageUrl ?? null,
    },
  });

  const watched = useWatch({ control });
  const discountType =
    watched.discountType === "percentage" || watched.discountType === "fixed"
      ? watched.discountType
      : "percentage";
  const discountValue = Number(watched.discountValue);
  const codePreview = (watched.code || "").trim().toUpperCase() || "YOURCODE";
  const isActive = Boolean(watched.isActive);
  const showOnStorefront = Boolean(watched.showOnStorefront);
  const promoImageSrc = resolveCmsImageUrl(watched.promoImageUrl);

  const example = useMemo(() => {
    const sampleSubtotal = 1000;
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return { sampleSubtotal, savings: 0, pay: sampleSubtotal };
    }
    let savings =
      discountType === "percentage"
        ? (sampleSubtotal * discountValue) / 100
        : discountValue;
    const maxCap = Number(watched.maximumDiscountAmount);
    if (
      discountType === "percentage" &&
      Number.isFinite(maxCap) &&
      maxCap > 0
    ) {
      savings = Math.min(savings, maxCap);
    }
    savings = Math.min(savings, sampleSubtotal);
    return {
      sampleSubtotal,
      savings,
      pay: Math.max(0, sampleSubtotal - savings),
    };
  }, [discountType, discountValue, watched.maximumDiscountAmount]);

  const offerLabel =
    discountType === "percentage"
      ? `${Number.isFinite(discountValue) ? discountValue : 0}% OFF`
      : formatMoney(Number.isFinite(discountValue) ? discountValue : 0, currency);

  function onSubmit(values: CouponFormValues) {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const payload = {
        ...values,
        startsAt: values.startsAt || null,
        expiresAt: values.expiresAt || null,
      };
      const result =
        mode === "create"
          ? await createCouponAction(payload)
          : await updateCouponAction(couponId!, payload);
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
      router.push(listHref);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full"
      style={adminStackStyle}
      noValidate
    >
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <p className="text-sm text-[var(--color-muted)]">
        Create a code customers enter at checkout. Optionally feature it on the
        homepage and suggest it in order summary.
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
        <div className="space-y-5">
          <SectionCard
            step="Step 1"
            title="Coupon code"
            hint="Short codes are easier to remember — e.g. WELCOME10."
          >
            <div>
              <TextField
                label="Code shoppers type"
                fullWidth
                required
                disabled={!canSubmit || pending}
                error={Boolean(errors.code)}
                helperText={
                  errors.code
                    ? undefined
                    : "Letters and numbers only. Saved in CAPITALS."
                }
                placeholder="WELCOME10"
                slotProps={{
                  htmlInput: {
                    style: { textTransform: "uppercase" },
                    "aria-invalid": Boolean(errors.code),
                    "aria-describedby": errors.code
                      ? "coupon-code-error"
                      : undefined,
                  },
                }}
                {...register("code")}
              />
              <FieldError
                id="coupon-code-error"
                message={errors.code?.message}
              />
            </div>
            <div>
              <TextField
                label="Internal note (optional)"
                fullWidth
                multiline
                minRows={2}
                disabled={!canSubmit || pending}
                error={Boolean(errors.description)}
                helperText={
                  errors.description
                    ? undefined
                    : "Not shown to customers — for your team only."
                }
                placeholder="Launch offer for first-time buyers"
                {...register("description")}
              />
              <FieldError message={errors.description?.message} />
            </div>
          </SectionCard>

          <SectionCard
            step="Step 2"
            title="Discount"
            hint={`Percent off the order, or a fixed amount in ${currency}.`}
          >
            <div className={adminFieldsGrid(2)}>
              <Controller
                name="discountType"
                control={control}
                render={({ field }) => (
                  <AdminSelect
                    label="Discount type"
                    disabled={!canSubmit || pending}
                    value={discountType}
                    onChange={field.onChange}
                    name={field.name}
                    options={[
                      { value: "percentage", label: "Percentage off (%)" },
                      {
                        value: "fixed",
                        label: `Fixed amount off (${currency})`,
                      },
                    ]}
                  />
                )}
              />
              <div>
                <TextField
                  label={
                    discountType === "percentage"
                      ? "Percent off"
                      : `Amount off (${currency})`
                  }
                  type="number"
                  fullWidth
                  required
                  disabled={!canSubmit || pending}
                  error={Boolean(errors.discountValue)}
                  helperText={
                    errors.discountValue
                      ? undefined
                      : discountType === "percentage"
                        ? "Example: 10 means 10% off"
                        : `Example: 100 means ${formatMoney(100, currency)} off`
                  }
                  slotProps={{ htmlInput: { step: "any", min: 0 } }}
                  {...register("discountValue", { valueAsNumber: true })}
                />
                <FieldError message={errors.discountValue?.message} />
              </div>
            </div>

            <div className={adminFieldsGrid(2)}>
              <div>
                <TextField
                  label={`Minimum order (${currency})`}
                  type="number"
                  fullWidth
                  disabled={!canSubmit || pending}
                  error={Boolean(errors.minimumOrderAmount)}
                  helperText={
                    errors.minimumOrderAmount
                      ? undefined
                      : "Blank = no minimum. Checked against cart subtotal."
                  }
                  placeholder="Optional"
                  slotProps={{ htmlInput: { step: "any", min: 0 } }}
                  {...register("minimumOrderAmount", {
                    setValueAs: (v) =>
                      v === "" || v == null || Number.isNaN(Number(v))
                        ? null
                        : Number(v),
                  })}
                />
                <FieldError message={errors.minimumOrderAmount?.message} />
              </div>
              {discountType === "percentage" ? (
                <div>
                  <TextField
                    label={`Max discount (${currency})`}
                    type="number"
                    fullWidth
                    disabled={!canSubmit || pending}
                    error={Boolean(errors.maximumDiscountAmount)}
                    helperText={
                      errors.maximumDiscountAmount
                        ? undefined
                        : "Optional cap so large carts do not get unlimited off."
                    }
                    placeholder="Optional"
                    slotProps={{ htmlInput: { step: "any", min: 0 } }}
                    {...register("maximumDiscountAmount", {
                      setValueAs: (v) =>
                        v === "" || v == null || Number.isNaN(Number(v))
                          ? null
                          : Number(v),
                    })}
                  />
                  <FieldError message={errors.maximumDiscountAmount?.message} />
                </div>
              ) : (
                <p className="self-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
                  Max discount only applies to percentage coupons.
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            step="Step 3"
            title="Limits & schedule"
            hint="How often the code can be used, and when it is valid."
          >
            <div className={adminFieldsGrid(2)}>
              <div>
                <TextField
                  label="Total uses allowed"
                  type="number"
                  fullWidth
                  disabled={!canSubmit || pending}
                  error={Boolean(errors.usageLimit)}
                  helperText={
                    errors.usageLimit
                      ? undefined
                      : "Blank = unlimited across all customers."
                  }
                  placeholder="Optional"
                  slotProps={{ htmlInput: { step: 1, min: 1 } }}
                  {...register("usageLimit", {
                    setValueAs: (v) =>
                      v === "" || v == null || Number.isNaN(Number(v))
                        ? null
                        : Math.trunc(Number(v)),
                  })}
                />
                <FieldError message={errors.usageLimit?.message} />
              </div>
              <div>
                <TextField
                  label="Uses per customer"
                  type="number"
                  fullWidth
                  disabled={!canSubmit || pending}
                  error={Boolean(errors.perUserLimit)}
                  helperText={
                    errors.perUserLimit
                      ? undefined
                      : "Blank = no per-person limit (signed-in)."
                  }
                  placeholder="Optional"
                  slotProps={{ htmlInput: { step: 1, min: 1 } }}
                  {...register("perUserLimit", {
                    setValueAs: (v) =>
                      v === "" || v == null || Number.isNaN(Number(v))
                        ? null
                        : Math.trunc(Number(v)),
                  })}
                />
                <FieldError message={errors.perUserLimit?.message} />
              </div>
              <Controller
                name="startsAt"
                control={control}
                render={({ field }) => (
                  <div className="min-w-0">
                    <AdminDateTimeField
                      label="Starts"
                      disabled={!canSubmit || pending}
                      error={Boolean(errors.startsAt)}
                      helperText={
                        errors.startsAt
                          ? undefined
                          : "Blank = starts as soon as you save."
                      }
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                    <FieldError message={errors.startsAt?.message} />
                  </div>
                )}
              />
              <Controller
                name="expiresAt"
                control={control}
                render={({ field }) => (
                  <div className="min-w-0">
                    <AdminDateTimeField
                      label="Ends"
                      disabled={!canSubmit || pending}
                      error={Boolean(errors.expiresAt)}
                      helperText={
                        errors.expiresAt
                          ? undefined
                          : "Blank = never expires."
                      }
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                    <FieldError message={errors.expiresAt?.message} />
                  </div>
                )}
              />
            </div>

            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  variant="row"
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!canSubmit || pending}
                  label={
                    isActive
                      ? "Active — customers can use this code"
                      : "Inactive — code will not apply at checkout"
                  }
                  description="Turn off to pause without deleting the coupon."
                />
              )}
            />
          </SectionCard>

          <SectionCard
            step="Step 4"
            title="Storefront promo"
            hint="Feature one coupon on the homepage modal and as a checkout suggestion."
          >
            <Controller
              name="showOnStorefront"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  variant="row"
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!canSubmit || pending}
                  label="Show on storefront"
                  description="Replaces any other featured coupon for this store."
                />
              )}
            />

            {showOnStorefront ? (
              <>
                <div>
                  <TextField
                    label="Promo headline"
                    fullWidth
                    required
                    disabled={!canSubmit || pending}
                    error={Boolean(errors.promoHeadline)}
                    placeholder="An offer you can't refuse!"
                    {...register("promoHeadline")}
                  />
                  <FieldError message={errors.promoHeadline?.message} />
                </div>
                <div>
                  <TextField
                    label="Supporting line (optional)"
                    fullWidth
                    disabled={!canSubmit || pending}
                    error={Boolean(errors.promoSubtext)}
                    placeholder="Get flat 10% on your next order."
                    {...register("promoSubtext")}
                  />
                  <FieldError message={errors.promoSubtext?.message} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    Promo image (optional)
                  </p>
                  {promoImageSrc ? (
                    <div className="relative mx-auto h-28 w-full max-w-[220px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                      <Image
                        src={promoImageSrc}
                        alt=""
                        fill
                        unoptimized
                        className="object-contain p-1.5"
                        sizes="220px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-muted)]">
                      No image selected
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={adminBtn("outline")}
                      disabled={!canSubmit || pending}
                      onClick={() => setMediaOpen(true)}
                    >
                      Choose image
                    </button>
                    {watched.promoImageUrl ? (
                      <button
                        type="button"
                        className={adminBtn("outline")}
                        disabled={!canSubmit || pending}
                        onClick={() =>
                          setValue("promoImageUrl", null, {
                            shouldDirty: true,
                          })
                        }
                      >
                        Remove image
                      </button>
                    ) : null}
                  </div>
                  <FieldError message={errors.promoImageUrl?.message} />
                </div>
              </>
            ) : null}
          </SectionCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <section className={`${adminCard()} ${adminCardPadding()}`}>
            <h3 className="text-base font-semibold text-[var(--color-foreground)]">
              Example at checkout
            </h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              If someone buys {formatMoney(example.sampleSubtotal, currency)}{" "}
              and enters <span className="font-medium">{codePreview}</span>:
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <dt>Discount</dt>
                <dd className="font-medium">
                  −{formatMoney(example.savings, currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-base font-semibold">
                <dt>They pay</dt>
                <dd>{formatMoney(example.pay, currency)}</dd>
              </div>
            </dl>
            {!isActive ? (
              <p className="mt-3 text-sm text-[var(--color-muted)]">
                Inactive — turn Active on before customers can use it.
              </p>
            ) : null}
          </section>

          {showOnStorefront ? (
            <section className={`${adminCard()} overflow-hidden`}>
              <div className="bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface))] px-4 py-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                  Homepage preview
                </p>
                {promoImageSrc ? (
                  <div className="relative mx-auto mt-3 h-24 w-full max-w-[160px]">
                    <Image
                      src={promoImageSrc}
                      alt=""
                      fill
                      unoptimized
                      className="object-contain"
                      sizes="160px"
                    />
                  </div>
                ) : null}
                <p className="mt-2 text-xl font-semibold leading-tight">
                  {watched.promoHeadline?.trim() || "Your promo headline"}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {watched.promoSubtext?.trim() || offerLabel}
                </p>
                <p className="mt-3 inline-flex rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-button-foreground)]">
                  USE CODE {codePreview}
                </p>
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap gap-2 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background)_92%,transparent)] px-1 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={!canSubmit || pending}
          className={adminBtn("primary")}
        >
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create coupon"
              : "Save changes"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push(listHref)}
          className={adminBtn("outline")}
        >
          Cancel
        </button>
      </div>

      <MediaPicker
        open={mediaOpen}
        folder="cms"
        onClose={() => setMediaOpen(false)}
        onSelect={(selection) => {
          setValue("promoImageUrl", selection.storagePath, {
            shouldDirty: true,
          });
          setMediaOpen(false);
        }}
      />
    </form>
  );
}
