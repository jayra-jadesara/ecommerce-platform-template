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
import {
  adminCard,
  adminCardPadding,
  adminCardsGrid,
  adminFieldGroup,
  adminFieldsGrid,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";

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

  const defaults = useMemo(
    () => ({
      ...DEFAULT_SHIPPING_SETTINGS,
      ...initialValues,
      method:
        initialValues.method === "flat_rate" ||
        initialValues.method === "free" ||
        initialValues.method === "percentage" ||
        initialValues.method === "zone"
          ? initialValues.method
          : DEFAULT_SHIPPING_SETTINGS.method,
      enabled: Boolean(initialValues.enabled),
      defaultShippingFee:
        initialValues.defaultShippingFee ??
        DEFAULT_SHIPPING_SETTINGS.defaultShippingFee,
    }),
    [initialValues],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError: setFieldError,
    setFocus,
    formState: { errors, isDirty },
  } = useForm<ShippingSettingsFormValues>({
    resolver: zodResolver(
      shippingSettingsSchema,
    ) as Resolver<ShippingSettingsFormValues>,
    defaultValues: defaults,
  });

  const watched = useWatch({ control });
  const method =
    watched.method === "flat_rate" ||
    watched.method === "free" ||
    watched.method === "percentage" ||
    watched.method === "zone"
      ? watched.method
      : "flat_rate";
  const deliveryOn = Boolean(watched.enabled);
  const showFlatFields = method === "flat_rate" || method === "zone";
  const showPercentage = method === "percentage";
  const showFreeThreshold = method === "flat_rate" || method === "zone";

  const preview = useMemo(() => {
    const threshold = Number(watched.freeShippingThreshold);
    const fee = Number(watched.defaultShippingFee);
    const enabled = Boolean(watched.enabled);
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
  }, [watched, currency, method]);

  const onSave = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveShippingSettingsAction(values);
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
        onResetDefaults={() => reset(DEFAULT_SHIPPING_SETTINGS)}
      />

      <div className={adminCardsGrid()}>
        <section className={`${adminCard()} ${adminCardPadding()}`} style={adminStackStyle}>
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">1. Offer delivery?</p>
          <p className="admin-field-group__hint">
            Turn this on if customers can get products delivered to their
            address.
          </p>
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
                label={deliveryOn ? "Yes — delivery is available" : "No — delivery is off"}
              />
            )}
          />
        </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={{
            ...adminStackStyle,
            opacity: deliveryOn ? 1 : 0.55,
            pointerEvents: deliveryOn ? "auto" : "none",
          }}
        >
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">2. How much do you charge?</p>
          <p className="admin-field-group__hint">
            Pick the simple option that matches how you deliver orders.
          </p>
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <div>
                <TextField
                  select
                  label="Delivery pricing"
                  fullWidth
                  required
                  disabled={!canUpdate || pending || !deliveryOn}
                  error={Boolean(errors.method)}
                  helperText={
                    errors.method
                      ? undefined
                      : "Most stores use a fixed delivery fee with free delivery on bigger orders."
                  }
                  value={
                    field.value === "flat_rate" ||
                    field.value === "free" ||
                    field.value === "percentage" ||
                    field.value === "zone"
                      ? field.value
                      : "flat_rate"
                  }
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                  name={field.name}
                  inputRef={field.ref}
                >
                  <MenuItem value="flat_rate">
                    Fixed fee (free above a certain order amount)
                  </MenuItem>
                  <MenuItem value="free">Always free delivery</MenuItem>
                  <MenuItem value="percentage">
                    Percentage of the order total
                  </MenuItem>
                  <MenuItem value="zone">
                    Different areas (uses your fixed fee for now)
                  </MenuItem>
                </TextField>
                <FieldError message={errors.method?.message} />
              </div>
            )}
          />

          {showFlatFields ? (
            <div>
              <TextField
                label={`Delivery fee (${currency})`}
                type="number"
                fullWidth
                required
                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                disabled={!canUpdate || pending || !deliveryOn}
                error={Boolean(errors.defaultShippingFee)}
                helperText={
                  errors.defaultShippingFee
                    ? undefined
                    : `What customers pay for delivery when free delivery does not apply.`
                }
                {...register("defaultShippingFee")}
              />
              <FieldError message={errors.defaultShippingFee?.message} />
            </div>
          ) : null}

          {showFreeThreshold ? (
            <div>
              <TextField
                label={`Free delivery starts at (${currency})`}
                type="number"
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                disabled={!canUpdate || pending || !deliveryOn}
                error={Boolean(errors.freeShippingThreshold)}
                helperText={
                  errors.freeShippingThreshold
                    ? undefined
                    : `Example: enter 500 so orders of ${formatMoney(500, currency)} or more get free delivery. Leave blank for no free threshold.`
                }
                {...register("freeShippingThreshold")}
              />
              <FieldError message={errors.freeShippingThreshold?.message} />
            </div>
          ) : null}

          {showPercentage ? (
            <div>
              <TextField
                label="Delivery percent of order"
                type="number"
                fullWidth
                slotProps={{ htmlInput: { min: 0, max: 100, step: "0.01" } }}
                disabled={!canUpdate || pending || !deliveryOn}
                error={Boolean(errors.percentageRate)}
                helperText={
                  errors.percentageRate
                    ? undefined
                    : "Example: 5 means delivery is 5% of the product total."
                }
                {...register("percentageRate")}
              />
              <FieldError message={errors.percentageRate?.message} />
            </div>
          ) : null}

          {method === "free" ? (
            <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
              Delivery will show as free on every order.
            </p>
          ) : null}
        </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={{
            ...adminStackStyle,
            opacity: deliveryOn ? 1 : 0.55,
            pointerEvents: deliveryOn ? "auto" : "none",
          }}
        >
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">3. How long does delivery take?</p>
          <p className="admin-field-group__hint">
            Shown to customers so they know when to expect their order.
          </p>
          <div className={adminFieldsGrid(2)}>
            <TextField
              label="Fastest delivery (days)"
              type="number"
              fullWidth
              disabled={!canUpdate || pending || !deliveryOn}
              helperText="Shortest usual time"
              {...register("estimatedDeliveryMinDays")}
            />
            <TextField
              label="Longest delivery (days)"
              type="number"
              fullWidth
              disabled={!canUpdate || pending || !deliveryOn}
              helperText="Longest usual time"
              {...register("estimatedDeliveryMaxDays")}
            />
          </div>
          <TextField
            label="Message customers see (optional)"
            fullWidth
            disabled={!canUpdate || pending || !deliveryOn}
            placeholder="Example: Delivered in 2–4 working days across India"
            helperText="A short note next to delivery at checkout."
            {...register("estimatedDeliveryLabel")}
          />
        </div>
        </section>

        <section className={`${adminCard()} ${adminCardPadding()}`}>
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          What customers will pay
        </h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Live examples based on your settings above.
        </p>
        {!deliveryOn ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Delivery is currently off — turn it on to see examples.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm">
              <span>If the order is {formatMoney(preview.sampleBelow, currency)}</span>
              <span className="font-semibold">
                Delivery{" "}
                {preview.below
                  ? formatMoney(preview.below.shipping.major, currency)
                  : "—"}
              </span>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm">
              <span>If the order is {formatMoney(preview.sampleAt, currency)}</span>
              <span className="font-semibold">
                Delivery{" "}
                {preview.at
                  ? formatMoney(preview.at.shipping.major, currency)
                  : "—"}
              </span>
            </li>
          </ul>
        )}
        </section>
      </div>
    </form>
  );
}
