"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { savePaymentSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  DEFAULT_PAYMENT_SETTINGS,
  paymentSettingsSchema,
  type PaymentSettingsFormValues,
} from "@/features/admin/settings/shipping-payment-schemas";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { calculateOrderPricing } from "@/features/pricing/engine";
import { majorToMinor } from "@/features/pricing/money";
import { formatMoney } from "@/features/catalog/money";
import {
  adminCard,
  adminFieldsGrid,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import { cn } from "@/lib/cn";

function sanitizePaymentValues(
  values: PaymentSettingsFormValues,
): PaymentSettingsFormValues {
  return {
    ...DEFAULT_PAYMENT_SETTINGS,
    ...values,
    razorpayEnabled: Boolean(values.razorpayEnabled),
    codEnabled: Boolean(values.codEnabled),
    feeEnabled: Boolean(values.feeEnabled),
    feeType:
      values.feeType === "PERCENTAGE" || values.feeType === "FIXED"
        ? values.feeType
        : DEFAULT_PAYMENT_SETTINGS.feeType,
    feeValue: Number.isFinite(Number(values.feeValue))
      ? Number(values.feeValue)
      : DEFAULT_PAYMENT_SETTINGS.feeValue,
    feeBasis:
      values.feeBasis === "SUBTOTAL" ||
      values.feeBasis === "SUBTOTAL_PLUS_SHIPPING" ||
      values.feeBasis === "ORDER_TOTAL_BEFORE_PAYMENT_FEE"
        ? values.feeBasis
        : DEFAULT_PAYMENT_SETTINGS.feeBasis,
    taxEnabled: Boolean(values.taxEnabled),
    taxType:
      values.taxType === "PERCENTAGE" || values.taxType === "FIXED"
        ? values.taxType
        : DEFAULT_PAYMENT_SETTINGS.taxType,
    taxValue: Number.isFinite(Number(values.taxValue))
      ? Number(values.taxValue)
      : DEFAULT_PAYMENT_SETTINGS.taxValue,
  };
}

function MethodChip({
  selected,
  disabled,
  title,
  hint,
  onToggle,
}: {
  selected: boolean;
  disabled: boolean;
  title: string;
  hint: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[2.75rem] items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-card))]"
          : "border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-surface)]",
      )}
    >
      <span
        className={cn(
          "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
          selected
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
            : "border-[var(--color-border)]",
        )}
        aria-hidden
      >
        {selected ? (
          <span className="text-[8px] font-bold leading-none">✓</span>
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight text-[var(--color-foreground)]">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-muted)]">
          {hint}
        </span>
      </span>
    </button>
  );
}

interface PaymentSettingsFormProps {
  initialValues: PaymentSettingsFormValues;
  currency: string;
  canUpdate: boolean;
  sampleShippingFee?: number;
}

export function PaymentSettingsForm({
  initialValues,
  currency,
  canUpdate,
  sampleShippingFee = 0,
}: PaymentSettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [previewMethod, setPreviewMethod] = useState<"razorpay" | "cod">(
    "razorpay",
  );

  const defaults = useMemo(
    () => sanitizePaymentValues(initialValues),
    [initialValues],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError: setFieldError,
    setFocus,
    formState: { errors, isDirty },
  } = useForm<PaymentSettingsFormValues>({
    resolver: zodResolver(
      paymentSettingsSchema,
    ) as Resolver<PaymentSettingsFormValues>,
    defaultValues: defaults,
  });

  const watched = useWatch({ control });
  const feeOn = Boolean(watched.feeEnabled);
  const taxOn = Boolean(watched.taxEnabled);
  const razorpayOn = Boolean(watched.razorpayEnabled);
  const codOn = Boolean(watched.codEnabled);
  const feeType =
    watched.feeType === "PERCENTAGE" || watched.feeType === "FIXED"
      ? watched.feeType
      : "PERCENTAGE";
  const taxType =
    watched.taxType === "PERCENTAGE" || watched.taxType === "FIXED"
      ? watched.taxType
      : "PERCENTAGE";

  const effectivePreviewMethod: "razorpay" | "cod" =
    previewMethod === "cod" && codOn
      ? "cod"
      : previewMethod === "razorpay" && razorpayOn
        ? "razorpay"
        : codOn && !razorpayOn
          ? "cod"
          : "razorpay";

  const preview = useMemo(() => {
    const sampleSubtotal = 1000;
    const feeValue = Number(watched.feeValue) || 0;
    const applyFee = feeOn && effectivePreviewMethod === "razorpay";
    const outcome = calculateOrderPricing({
      currency,
      lines: [
        {
          productId: "preview",
          variantId: "preview",
          quantity: 1,
          unitPriceMinor: majorToMinor(sampleSubtotal, currency),
        },
      ],
      shipping: {
        enabled: sampleShippingFee > 0,
        method: "flat_rate",
        freeShippingThresholdMinor: null,
        defaultShippingFeeMinor: majorToMinor(sampleShippingFee, currency),
        percentageRate: null,
      },
      paymentFee: {
        enabled: applyFee,
        feeType,
        feeValue:
          feeType === "FIXED" ? majorToMinor(feeValue, currency) : feeValue,
        feeBasis:
          watched.feeBasis === "SUBTOTAL" ||
          watched.feeBasis === "SUBTOTAL_PLUS_SHIPPING" ||
          watched.feeBasis === "ORDER_TOTAL_BEFORE_PAYMENT_FEE"
            ? watched.feeBasis
            : "SUBTOTAL_PLUS_SHIPPING",
      },
      tax: {
        enabled: taxOn,
        taxType,
        taxValue:
          taxType === "FIXED"
            ? majorToMinor(Number(watched.taxValue) || 0, currency)
            : Number(watched.taxValue) || 0,
      },
      discount: { amountMinor: 0 },
    });
    return {
      sampleSubtotal,
      pricing: outcome.ok ? outcome.pricing : null,
      applyFee,
    };
  }, [
    watched,
    currency,
    sampleShippingFee,
    feeOn,
    taxOn,
    feeType,
    taxType,
    effectivePreviewMethod,
  ]);

  const onSave = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await savePaymentSettingsAction(values);
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
      reset(sanitizePaymentValues(values));
      router.refresh();
    });
  });

  const locked = !canUpdate || pending;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      className="w-full"
      style={{ ...adminStackStyle, gap: "0.85rem" }}
      noValidate
    >
      <SettingsFormToolbar
        isDirty={isDirty}
        canUpdate={canUpdate}
        pending={pending}
        error={error}
        success={success}
        onSave={onSave}
        onCancel={() => {
          reset(defaults);
          setError(null);
          setSuccess(null);
        }}
        onResetDefaults={() => reset(DEFAULT_PAYMENT_SETTINGS)}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_15.5rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <section className={cn(adminCard(), "p-4")}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
                Payment methods
              </h2>
              <p className="text-[11px] text-[var(--color-muted)]">
                Multi-select · secrets stay on server
              </p>
            </div>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              <MethodChip
                selected={razorpayOn}
                disabled={locked}
                title="Razorpay"
                hint="Pay online (card / UPI)"
                onToggle={() =>
                  setValue("razorpayEnabled", !razorpayOn, {
                    shouldDirty: true,
                  })
                }
              />
              <MethodChip
                selected={codOn}
                disabled={locked}
                title="Cash on Delivery"
                hint="Pay cash on delivery"
                onToggle={() =>
                  setValue("codEnabled", !codOn, { shouldDirty: true })
                }
              />
            </div>
            {!razorpayOn && !codOn ? (
              <p className="mt-2 text-[11px] text-[var(--color-error)]">
                Enable at least one method or checkout cannot complete.
              </p>
            ) : null}
          </section>

          <section className={cn(adminCard(), "p-4")}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Payment fee
                </h2>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
                  Pass gateway cost to customers. Fee applies only for Razorpay —
                  never for COD.
                </p>
              </div>
              <div className="shrink-0 whitespace-nowrap [&_.MuiFormControlLabel-root]:!ml-0 [&_.MuiFormControlLabel-root]:!mr-0">
                <Controller
                  name="feeEnabled"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={locked}
                      label={feeOn ? "On" : "Off"}
                      className="!mr-0"
                    />
                  )}
                />
              </div>
            </div>

            {feeOn ? (
              <div className="mt-3 space-y-2.5 border-t border-[var(--color-border)] pt-3">
                <div className={adminFieldsGrid(2)}>
                  <Controller
                    name="feeType"
                    control={control}
                    render={({ field }) => (
                      <AdminSelect
                        label="Type"
                        required
                        disabled={locked}
                        value={feeType}
                        onChange={field.onChange}
                        name={field.name}
                        options={[
                          { value: "PERCENTAGE", label: "Percentage (%)" },
                          {
                            value: "FIXED",
                            label: `Fixed (${currency})`,
                          },
                        ]}
                      />
                    )}
                  />
                  <div>
                    <TextField
                      label={
                        feeType === "PERCENTAGE"
                          ? "Percent"
                          : `Amount (${currency})`
                      }
                      type="number"
                      fullWidth
                      size="small"
                      required
                      slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                      disabled={locked}
                      error={Boolean(errors.feeValue)}
                      helperText={
                        errors.feeValue
                          ? undefined
                          : feeType === "PERCENTAGE"
                            ? "e.g. 2 = 2%"
                            : `e.g. 50`
                      }
                      {...register("feeValue")}
                    />
                    <FieldError message={errors.feeValue?.message} />
                  </div>
                </div>
                {feeType === "PERCENTAGE" ? (
                  <Controller
                    name="feeBasis"
                    control={control}
                    render={({ field }) => (
                      <AdminSelect
                        label="% of"
                        required
                        disabled={locked}
                        value={
                          field.value === "SUBTOTAL" ||
                          field.value === "SUBTOTAL_PLUS_SHIPPING" ||
                          field.value === "ORDER_TOTAL_BEFORE_PAYMENT_FEE"
                            ? field.value === "ORDER_TOTAL_BEFORE_PAYMENT_FEE"
                              ? "SUBTOTAL_PLUS_SHIPPING"
                              : field.value
                            : "SUBTOTAL_PLUS_SHIPPING"
                        }
                        onChange={field.onChange}
                        name={field.name}
                        options={[
                          {
                            value: "SUBTOTAL",
                            label: "Products only",
                          },
                          {
                            value: "SUBTOTAL_PLUS_SHIPPING",
                            label: "Products + delivery",
                          },
                        ]}
                      />
                    )}
                  />
                ) : null}
              </div>
            ) : null}
          </section>

          <section className={cn(adminCard(), "p-4")}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Tax / GST
                </h2>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
                  Added at checkout for Razorpay and COD.
                </p>
              </div>
              <div className="shrink-0 whitespace-nowrap [&_.MuiFormControlLabel-root]:!ml-0 [&_.MuiFormControlLabel-root]:!mr-0">
                <Controller
                  name="taxEnabled"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={locked}
                      label={taxOn ? "On" : "Off"}
                      className="!mr-0"
                    />
                  )}
                />
              </div>
            </div>

            {taxOn ? (
              <div
                className={cn(
                  "mt-3 border-t border-[var(--color-border)] pt-3",
                  adminFieldsGrid(2),
                )}
              >
                <Controller
                  name="taxType"
                  control={control}
                  render={({ field }) => (
                    <AdminSelect
                      label="Type"
                      required
                      disabled={locked}
                      value={taxType}
                      onChange={field.onChange}
                      name={field.name}
                      options={[
                        { value: "PERCENTAGE", label: "Percentage (%)" },
                        {
                          value: "FIXED",
                          label: `Fixed (${currency})`,
                        },
                      ]}
                    />
                  )}
                />
                <div>
                  <TextField
                    label={
                      taxType === "PERCENTAGE"
                        ? "Percent"
                        : `Amount (${currency})`
                    }
                    type="number"
                    fullWidth
                    size="small"
                    required
                    slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                    disabled={locked}
                    error={Boolean(errors.taxValue)}
                    helperText={
                      errors.taxValue
                        ? undefined
                        : taxType === "PERCENTAGE"
                          ? "e.g. 18 for GST"
                          : undefined
                    }
                    {...register("taxValue")}
                  />
                  <FieldError message={errors.taxValue?.message} />
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <aside className={cn(adminCard(), "p-3.5 xl:sticky xl:top-3")}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
              Preview
            </h2>
            {(razorpayOn || codOn) && (
              <div className="flex gap-1">
                {razorpayOn ? (
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                      effectivePreviewMethod === "razorpay"
                        ? "bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                        : "bg-[var(--color-surface)] text-[var(--color-muted)]",
                    )}
                    onClick={() => setPreviewMethod("razorpay")}
                  >
                    Online
                  </button>
                ) : null}
                {codOn ? (
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                      effectivePreviewMethod === "cod"
                        ? "bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                        : "bg-[var(--color-surface)] text-[var(--color-muted)]",
                    )}
                    onClick={() => setPreviewMethod("cod")}
                  >
                    COD
                  </button>
                ) : null}
              </div>
            )}
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            {formatMoney(preview.sampleSubtotal, currency)}
            {sampleShippingFee > 0
              ? ` + ${formatMoney(sampleShippingFee, currency)} delivery`
              : ""}
          </p>

          {preview.pricing ? (
            <dl className="mt-3 space-y-1.5 text-[12px]">
              <PreviewLine
                label="Products"
                value={formatMoney(preview.pricing.subtotal.major, currency)}
              />
              <PreviewLine
                label="Delivery"
                value={formatMoney(preview.pricing.shipping.major, currency)}
              />
              <PreviewLine
                label="Fee"
                muted={!preview.applyFee}
                value={
                  preview.applyFee
                    ? formatMoney(preview.pricing.paymentFee.major, currency)
                    : "—"
                }
              />
              <PreviewLine
                label="Tax"
                muted={!taxOn}
                value={
                  taxOn
                    ? formatMoney(preview.pricing.tax.major, currency)
                    : "—"
                }
              />
              <div className="mt-2 flex items-baseline justify-between border-t border-[var(--color-border)] pt-2">
                <dt className="text-[12px] font-semibold text-[var(--color-foreground)]">
                  Total
                </dt>
                <dd className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  {formatMoney(preview.pricing.grandTotal.major, currency)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-[11px] text-red-700">Preview unavailable.</p>
          )}
        </aside>
      </div>
    </form>
  );
}

function PreviewLine({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-2",
        muted && "text-[var(--color-muted)]",
      )}
    >
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="font-medium tabular-nums text-[var(--color-foreground)]">
        {value}
      </dd>
    </div>
  );
}
