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
            label="Shipping enabled"
          />
        )}
      />

      <TextField
        select
        label="Shipping method"
        fullWidth
        disabled={!canUpdate || pending}
        error={Boolean(errors.method)}
        helperText={errors.method?.message}
        {...register("method")}
      >
        <MenuItem value="flat_rate">Flat rate (+ free threshold)</MenuItem>
        <MenuItem value="free">Always free</MenuItem>
        <MenuItem value="percentage">Percentage of subtotal</MenuItem>
        <MenuItem value="zone">Zone (uses flat fee until zone rules exist)</MenuItem>
      </TextField>

      <TextField
        label="Default shipping fee"
        type="number"
        fullWidth
        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
        disabled={!canUpdate || pending}
        error={Boolean(errors.defaultShippingFee)}
        helperText={
          errors.defaultShippingFee?.message ||
          `Major units in ${currency}`
        }
        {...register("defaultShippingFee")}
      />

      <TextField
        label="Free shipping threshold"
        type="number"
        fullWidth
        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
        disabled={!canUpdate || pending}
        error={Boolean(errors.freeShippingThreshold)}
        helperText={
          errors.freeShippingThreshold?.message ||
          `Subtotal at or above this amount ships free (when shipping is enabled). Currency: ${currency}`
        }
        {...register("freeShippingThreshold")}
      />

      <TextField
        label="Percentage rate"
        type="number"
        fullWidth
        slotProps={{ htmlInput: { min: 0, max: 100, step: "0.01" } }}
        disabled={!canUpdate || pending || watched.method !== "percentage"}
        helperText="Used when method is percentage"
        {...register("percentageRate")}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Est. delivery min days"
          type="number"
          fullWidth
          disabled={!canUpdate || pending}
          {...register("estimatedDeliveryMinDays")}
        />
        <TextField
          label="Est. delivery max days"
          type="number"
          fullWidth
          disabled={!canUpdate || pending}
          {...register("estimatedDeliveryMaxDays")}
        />
      </div>

      <TextField
        label="Delivery label"
        fullWidth
        disabled={!canUpdate || pending}
        {...register("estimatedDeliveryLabel")}
      />

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="font-semibold">Live preview</h3>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Preview only — customer checkout uses the server pricing engine.
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
