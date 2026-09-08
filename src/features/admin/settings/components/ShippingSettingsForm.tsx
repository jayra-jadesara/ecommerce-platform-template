"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { saveShippingSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  DEFAULT_SHIPPING_SETTINGS,
  shippingSettingsSchema,
  type ShippingSettingsFormValues,
} from "@/features/admin/settings/shipping-payment-schemas";
import { calculateOrderPricing } from "@/features/pricing/engine";
import { majorToMinor } from "@/features/pricing/money";
import { formatMoney } from "@/features/catalog/money";

interface ShippingSettingsFormProps {
  initialValues: ShippingSettingsFormValues;
  currency: string;
  canUpdate: boolean;
}

export function ShippingSettingsForm({
  initialValues,
  currency,
  canUpdate,
}: ShippingSettingsFormProps) {
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
  } = useForm<ShippingSettingsFormValues>({
    resolver: zodResolver(
      shippingSettingsSchema,
    ) as Resolver<ShippingSettingsFormValues>,
    defaultValues: initialValues,
  });

  const watched = useWatch({ control });

  const preview = useMemo(() => {
    const threshold = Number(watched.freeShippingThreshold);
    const fee = Number(watched.defaultShippingFee);
    const enabled = Boolean(watched.enabled);
    const method = watched.method || "flat_rate";
    const sampleBelow =
      Number.isFinite(threshold) && threshold > 0
        ? Math.max(0, threshold - Math.max(fee, 1))
        : 100;
    const sampleAt =
      Number.isFinite(threshold) && threshold > 0 ? threshold : sampleBelow + fee;

    const run = (subtotalMajor: number) => {
      const outcome = calculateOrderPricing({
        currency,
        lines: [
          {
            productId: "preview",
            variantId: "preview",
            quantity: 1,
            unitPriceMinor: majorToMinor(subtotalMajor, currency),
          },
        ],
        shipping: {
          enabled,
          method,
          freeShippingThresholdMinor:
            Number.isFinite(threshold) && threshold >= 0
              ? majorToMinor(threshold, currency)
              : null,
          defaultShippingFeeMinor: majorToMinor(
            Number.isFinite(fee) ? fee : 0,
            currency,
          ),
          percentageRate:
            watched.percentageRate == null
              ? null
              : Number(watched.percentageRate),
        },
        paymentFee: {
          enabled: false,
          feeType: "PERCENTAGE",
          feeValue: 0,
          feeBasis: "SUBTOTAL_PLUS_SHIPPING",
        },
        tax: { enabled: false, taxType: "PERCENTAGE", taxValue: 0 },
        discount: { amountMinor: 0 },
      });
      return outcome.ok ? outcome.pricing : null;
    };

    return {
      below: run(sampleBelow),
      at: run(sampleAt),
      sampleBelow,
      sampleAt,
    };
  }, [watched, currency]);

  const onSave = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveShippingSettingsAction(values);
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
        onResetDefaults={() => reset(DEFAULT_SHIPPING_SETTINGS)}
      />

      <Controller
        name="enabled"
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
            label="Offer delivery"
          />
        )}
      />

      <TextField
        select
        label="How shipping is calculated"
        fullWidth
        required
        disabled={!canUpdate || pending}
        error={Boolean(errors.method)}
        helperText={errors.method?.message}
        {...register("method")}
      >
        <MenuItem value="flat_rate">Flat delivery charge (+ free above amount)</MenuItem>
        <MenuItem value="free">Always free delivery</MenuItem>
        <MenuItem value="percentage">Percentage of order subtotal</MenuItem>
        <MenuItem value="zone">By delivery zone (uses flat charge for now)</MenuItem>
      </TextField>

      <TextField
        label="Delivery charge"
        type="number"
        fullWidth
        required
        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
        disabled={!canUpdate || pending}
        error={Boolean(errors.defaultShippingFee)}
        helperText={
          errors.defaultShippingFee?.message ||
          `Amount charged for delivery (${currency}) when free delivery does not apply.`
        }
        {...register("defaultShippingFee")}
      />

      <TextField
        label="Free delivery above"
        type="number"
        fullWidth
        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
        disabled={!canUpdate || pending}
        error={Boolean(errors.freeShippingThreshold)}
        helperText={
          errors.freeShippingThreshold?.message ||
          `Customers get free delivery when their order reaches this amount (${currency}).`
        }
        {...register("freeShippingThreshold")}
      />

      <TextField
        label="Percentage rate"
        type="number"
        fullWidth
        slotProps={{ htmlInput: { min: 0, max: 100, step: "0.01" } }}
        disabled={!canUpdate || pending || watched.method !== "percentage"}
        helperText="Only used when shipping is calculated as a percentage"
        {...register("percentageRate")}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Delivery time (min days)"
          type="number"
          fullWidth
          disabled={!canUpdate || pending}
          {...register("estimatedDeliveryMinDays")}
        />
        <TextField
          label="Delivery time (max days)"
          type="number"
          fullWidth
          disabled={!canUpdate || pending}
          {...register("estimatedDeliveryMaxDays")}
        />
      </div>

      <TextField
        label="Delivery note shown to customers"
        fullWidth
        disabled={!canUpdate || pending}
        {...register("estimatedDeliveryLabel")}
      />

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="font-semibold">Example checkout</h3>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Approximate delivery charge for sample order amounts.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            Order {formatMoney(preview.sampleBelow, currency)} → shipping{" "}
            {preview.below
              ? formatMoney(preview.below.shipping.major, currency)
              : "—"}
          </li>
          <li>
            Order {formatMoney(preview.sampleAt, currency)} → shipping{" "}
            {preview.at
              ? formatMoney(preview.at.shipping.major, currency)
              : "—"}
          </li>
        </ul>
        {watched.method === "percentage" && watched.percentageRate != null ? (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Percentage method uses the configured rate against the order
            subtotal (see preview rows above).
          </p>
        ) : null}
      </section>
    </form>
  );
}
