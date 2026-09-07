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
    defaultValues: initialValues,
  });

  const watched = useWatch({ control });

  const preview = useMemo(() => {
    const sampleSubtotal = 1000;
    const feeType = watched.feeType || "PERCENTAGE";
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
        enabled: Boolean(watched.feeEnabled),
        feeType,
        feeValue:
          feeType === "FIXED" ? majorToMinor(feeValue, currency) : feeValue,
        feeBasis: watched.feeBasis || "SUBTOTAL_PLUS_SHIPPING",
      },
      tax: {
        enabled: Boolean(watched.taxEnabled),
        taxType: watched.taxType || "PERCENTAGE",
        taxValue:
          (watched.taxType || "PERCENTAGE") === "FIXED"
            ? majorToMinor(Number(watched.taxValue) || 0, currency)
            : Number(watched.taxValue) || 0,
      },
      discount: { amountMinor: 0 },
    });
    return {
      sampleSubtotal,
      pricing: outcome.ok ? outcome.pricing : null,
    };
  }, [watched, currency, sampleShippingFee]);

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
      reset(values);
      router.refresh();
    });
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      className="space-y-4"
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
          reset(initialValues);
          setError(null);
          setSuccess(null);
        }}
        onResetDefaults={() => reset(DEFAULT_PAYMENT_SETTINGS)}
      />

      <TextField
        select
        label="Payment provider"
        fullWidth
        disabled={!canUpdate || pending}
        helperText="Execution (e.g. Razorpay) is configured later. Secrets stay in environment variables."
        {...register("provider")}
      >
        <MenuItem value="none">None</MenuItem>
        <MenuItem value="razorpay">Razorpay</MenuItem>
        <MenuItem value="other">Other</MenuItem>
      </TextField>

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
            label="Gateway / payment fee enabled"
          />
        )}
      />

      <TextField
        select
        label="Fee type"
        fullWidth
        disabled={!canUpdate || pending}
        {...register("feeType")}
      >
        <MenuItem value="PERCENTAGE">Percentage</MenuItem>
        <MenuItem value="FIXED">Fixed amount</MenuItem>
      </TextField>

      <TextField
        label="Fee value"
        type="number"
        fullWidth
        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
        disabled={!canUpdate || pending}
        error={Boolean(errors.feeValue)}
        helperText={
          errors.feeValue?.message ||
          (watched.feeType === "PERCENTAGE"
            ? "Percentage 0–100"
            : `Fixed amount in ${currency}`)
        }
        {...register("feeValue")}
      />

      <TextField
        select
        label="Fee basis"
        fullWidth
        disabled={!canUpdate || pending}
        helperText="Default: subtotal − discount + shipping (before payment fee)."
        {...register("feeBasis")}
      >
        <MenuItem value="SUBTOTAL">Subtotal (after discount)</MenuItem>
        <MenuItem value="SUBTOTAL_PLUS_SHIPPING">
          Subtotal + shipping
        </MenuItem>
        <MenuItem value="ORDER_TOTAL_BEFORE_PAYMENT_FEE">
          Order total before payment fee
        </MenuItem>
      </TextField>

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
            label="Tax enabled"
          />
        )}
      />

      <TextField
        select
        label="Tax type"
        fullWidth
        disabled={!canUpdate || pending}
        {...register("taxType")}
      >
        <MenuItem value="PERCENTAGE">Percentage</MenuItem>
        <MenuItem value="FIXED">Fixed amount</MenuItem>
      </TextField>

      <TextField
        label="Tax value"
        type="number"
        fullWidth
        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
        disabled={!canUpdate || pending}
        error={Boolean(errors.taxValue)}
        helperText={errors.taxValue?.message}
        {...register("taxValue")}
      />

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="font-semibold">Live preview</h3>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Sample subtotal {formatMoney(preview.sampleSubtotal, currency)}
          {sampleShippingFee > 0
            ? ` + shipping ${formatMoney(sampleShippingFee, currency)}`
            : ""}
          . Customer totals always recalculate server-side.
        </p>
        {preview.pricing ? (
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatMoney(preview.pricing.subtotal.major, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>{formatMoney(preview.pricing.shipping.major, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Payment fee</dt>
              <dd>{formatMoney(preview.pricing.paymentFee.major, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Tax</dt>
              <dd>{formatMoney(preview.pricing.tax.major, currency)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Grand total</dt>
              <dd>
                {formatMoney(preview.pricing.grandTotal.major, currency)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-red-700">Invalid preview inputs.</p>
        )}
      </section>
    </form>
  );
}
