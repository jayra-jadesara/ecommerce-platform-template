"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
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
import { calculateOrderPricing } from "@/features/pricing/engine";
import { majorToMinor } from "@/features/pricing/money";
import { formatMoney } from "@/features/catalog/money";
import {
  adminCard,
  adminCardPadding,
  adminFieldGroup,
  adminFieldsGrid,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";

function sanitizePaymentValues(
  values: PaymentSettingsFormValues,
): PaymentSettingsFormValues {
  return {
    ...DEFAULT_PAYMENT_SETTINGS,
    ...values,
    provider:
      values.provider === "none" ||
      values.provider === "razorpay" ||
      values.provider === "other"
        ? values.provider
        : DEFAULT_PAYMENT_SETTINGS.provider,
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

  const defaults = useMemo(
    () => sanitizePaymentValues(initialValues),
    [initialValues],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
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
  const feeType =
    watched.feeType === "PERCENTAGE" || watched.feeType === "FIXED"
      ? watched.feeType
      : "PERCENTAGE";
  const taxType =
    watched.taxType === "PERCENTAGE" || watched.taxType === "FIXED"
      ? watched.taxType
      : "PERCENTAGE";
  const provider =
    watched.provider === "none" ||
    watched.provider === "razorpay" ||
    watched.provider === "other"
      ? watched.provider
      : "none";

  const preview = useMemo(() => {
    const sampleSubtotal = 1000;
    const feeValue = Number(watched.feeValue) || 0;
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
        enabled: feeOn,
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
    };
  }, [watched, currency, sampleShippingFee, feeOn, taxOn, feeType, taxType]);

  const onSave = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await savePaymentSettingsAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? "Saved.");
      reset(sanitizePaymentValues(values));
      router.refresh();
    });
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      className="w-full"
      style={adminStackStyle}
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

      <p className="text-sm text-[var(--color-muted)]">
        Choose how customers pay, then optionally add a checkout fee or tax.
        API keys stay in your server settings — never paste secrets here.
      </p>

      <section className={`${adminCard()} ${adminCardPadding()}`} style={adminStackStyle}>
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">1. How do customers pay?</p>
          <p className="admin-field-group__hint">
            Pick a payment provider for checkout. Razorpay enables Pay Now.
          </p>
          <Controller
            name="provider"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Payment method"
                fullWidth
                required
                disabled={!canUpdate || pending}
                helperText={
                  provider === "razorpay"
                    ? "Razorpay is on — customers can pay online at checkout."
                    : provider === "none"
                      ? "Online payment is off until you choose a provider."
                      : "This option is reserved for a future provider."
                }
                value={provider}
                onChange={(event) => field.onChange(event.target.value)}
                onBlur={field.onBlur}
                name={field.name}
                inputRef={field.ref}
              >
                <MenuItem value="none">No online payment yet</MenuItem>
                <MenuItem value="razorpay">Razorpay (Pay Now)</MenuItem>
                <MenuItem value="other">Other (not set up yet)</MenuItem>
              </TextField>
            )}
          />
        </div>
      </section>

      <section className={`${adminCard()} ${adminCardPadding()}`} style={adminStackStyle}>
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">2. Checkout fee (optional)</p>
          <p className="admin-field-group__hint">
            Extra charge added at checkout — for example a card processing fee.
          </p>
          <Controller
            name="feeEnabled"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(field.value)}
                    onChange={(_, checked) => field.onChange(checked)}
                    disabled={!canUpdate || pending}
                  />
                }
                label={
                  feeOn
                    ? "Yes — add a fee at checkout"
                    : "No — do not add a payment fee"
                }
              />
            )}
          />

          {feeOn ? (
            <>
              <div className={adminFieldsGrid(2)}>
                <Controller
                  name="feeType"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Fee type"
                      fullWidth
                      required
                      disabled={!canUpdate || pending}
                      value={feeType}
                      onChange={(event) => field.onChange(event.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      inputRef={field.ref}
                      helperText="Percent of the order, or a fixed amount"
                    >
                      <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
                      <MenuItem value="FIXED">
                        Fixed amount ({currency})
                      </MenuItem>
                    </TextField>
                  )}
                />
                <TextField
                  label={
                    feeType === "PERCENTAGE"
                      ? "Fee percent"
                      : `Fee amount (${currency})`
                  }
                  type="number"
                  fullWidth
                  required
                  slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                  disabled={!canUpdate || pending}
                  error={Boolean(errors.feeValue)}
                  helperText={
                    errors.feeValue?.message ||
                    (feeType === "PERCENTAGE"
                      ? "Example: 2 means a 2% fee"
                      : `Amount added in ${currency}`)
                  }
                  {...register("feeValue")}
                />
              </div>
              <Controller
                name="feeBasis"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Calculate fee on"
                    fullWidth
                    required
                    disabled={!canUpdate || pending}
                    helperText="Most stores use products + delivery"
                    value={
                      field.value === "SUBTOTAL" ||
                      field.value === "SUBTOTAL_PLUS_SHIPPING" ||
                      field.value === "ORDER_TOTAL_BEFORE_PAYMENT_FEE"
                        ? field.value
                        : "SUBTOTAL_PLUS_SHIPPING"
                    }
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    name={field.name}
                    inputRef={field.ref}
                  >
                    <MenuItem value="SUBTOTAL">
                      Product total (after discount)
                    </MenuItem>
                    <MenuItem value="SUBTOTAL_PLUS_SHIPPING">
                      Product total + delivery
                    </MenuItem>
                    <MenuItem value="ORDER_TOTAL_BEFORE_PAYMENT_FEE">
                      Full order before this fee
                    </MenuItem>
                  </TextField>
                )}
              />
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
              No payment fee will be added. Turn this on only if you need to
              pass processing costs to customers.
            </p>
          )}
        </div>
      </section>

      <section className={`${adminCard()} ${adminCardPadding()}`} style={adminStackStyle}>
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">3. Tax (optional)</p>
          <p className="admin-field-group__hint">
            Add sales tax / GST on top of the order if your store needs it.
          </p>
          <Controller
            name="taxEnabled"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(field.value)}
                    onChange={(_, checked) => field.onChange(checked)}
                    disabled={!canUpdate || pending}
                  />
                }
                label={taxOn ? "Yes — charge tax" : "No — do not charge tax"}
              />
            )}
          />

          {taxOn ? (
            <div className={adminFieldsGrid(2)}>
              <Controller
                name="taxType"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Tax type"
                    fullWidth
                    required
                    disabled={!canUpdate || pending}
                    value={taxType}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    name={field.name}
                    inputRef={field.ref}
                    helperText="Percent of the order, or a fixed amount"
                  >
                    <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
                    <MenuItem value="FIXED">
                      Fixed amount ({currency})
                    </MenuItem>
                  </TextField>
                )}
              />
              <TextField
                label={
                  taxType === "PERCENTAGE"
                    ? "Tax percent"
                    : `Tax amount (${currency})`
                }
                type="number"
                fullWidth
                required
                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                disabled={!canUpdate || pending}
                error={Boolean(errors.taxValue)}
                helperText={
                  errors.taxValue?.message ||
                  (taxType === "PERCENTAGE"
                    ? "Example: 18 for 18% GST"
                    : `Fixed tax in ${currency}`)
                }
                {...register("taxValue")}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
              Tax is off. Turn this on if you need to collect tax at checkout.
            </p>
          )}
        </div>
      </section>

      <section className={`${adminCard()} ${adminCardPadding()}`}>
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          What the customer pays
        </h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Example order of {formatMoney(preview.sampleSubtotal, currency)}
          {sampleShippingFee > 0
            ? ` with delivery ${formatMoney(sampleShippingFee, currency)}`
            : ""}
          .
        </p>
        {preview.pricing ? (
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <dt>Products</dt>
              <dd className="font-medium">
                {formatMoney(preview.pricing.subtotal.major, currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <dt>Delivery</dt>
              <dd className="font-medium">
                {formatMoney(preview.pricing.shipping.major, currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <dt>Payment fee{feeOn ? "" : " (off)"}</dt>
              <dd className="font-medium">
                {formatMoney(preview.pricing.paymentFee.major, currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <dt>Tax{taxOn ? "" : " (off)"}</dt>
              <dd className="font-medium">
                {formatMoney(preview.pricing.tax.major, currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-base font-semibold">
              <dt>Customer pays</dt>
              <dd>
                {formatMoney(preview.pricing.grandTotal.major, currency)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-red-700">
            Check the numbers above — preview could not be calculated.
          </p>
        )}
      </section>
    </form>
  );
}
