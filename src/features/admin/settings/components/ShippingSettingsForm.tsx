"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import {
  adminCard,
  adminCardPadding,
  adminCardSpanFull,
  adminCardsGrid,
  adminFieldsGrid,
  adminSectionDesc,
  adminSectionTitle,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import {
  FULFILLMENT_MODE_OPTIONS,
  REPLACE_WINDOW_HOURS,
  RETURN_POLICY_OPTIONS,
  coerceReplaceMaxAttempts,
  coerceReplaceReasonOptions,
  coerceReplaceWindowHours,
  isOtherReplaceReason,
  returnPolicyLabel,
  type FulfillmentMode,
  type ReturnPolicy,
} from "@/features/shipping/policies";
import { cn } from "@/lib/cn";

interface ShippingSettingsFormProps {
  initialValues: ShippingSettingsFormValues;
  currency: string;
  canUpdate: boolean;
}

function ChoiceCard({
  selected,
  disabled,
  title,
  description,
  badge,
  onSelect,
}: {
  selected: boolean;
  disabled: boolean;
  title: string;
  description: string;
  badge?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "rounded-2xl border px-4 py-4 text-left transition-[border-color,background-color,box-shadow]",
        "outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:!bg-[var(--color-card)] disabled:!shadow-none",
        selected
          ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] shadow-[0_0_0_1px_var(--color-primary)] disabled:!bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))]"
          : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[color-mix(in_srgb,var(--color-foreground)_22%,var(--color-border))]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
          {title}
        </span>
        <span
          className={cn(
            "mt-0.5 inline-flex h-4 w-4 shrink-0 rounded-full border-2",
            selected
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
              : "border-[var(--color-border)] bg-transparent",
          )}
          aria-hidden
        />
      </div>
      {badge ? (
        <span className="mt-2 inline-block rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {badge}
        </span>
      ) : null}
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        {description}
      </p>
    </button>
  );
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

  const defaults = useMemo((): ShippingSettingsFormValues => {
    return {
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
      fulfillmentMode:
        initialValues.fulfillmentMode === "courier_api"
          ? "courier_api"
          : "auto_days",
      returnPolicy:
        initialValues.returnPolicy === "no_replace" ||
        initialValues.returnPolicy === "replace_only"
          ? initialValues.returnPolicy
          : "no_return_refund",
      replacePhotoRequired: Boolean(initialValues.replacePhotoRequired),
      replaceWindowHours: coerceReplaceWindowHours(
        initialValues.replaceWindowHours,
      ),
      replaceMaxAttempts: coerceReplaceMaxAttempts(
        initialValues.replaceMaxAttempts,
      ),
      replaceReasonOptions: coerceReplaceReasonOptions(
        initialValues.replaceReasonOptions,
      ),
      autoDeliverAfterDays:
        initialValues.autoDeliverAfterDays ??
        DEFAULT_SHIPPING_SETTINGS.autoDeliverAfterDays,
      defaultShippingFee:
        initialValues.defaultShippingFee ??
        DEFAULT_SHIPPING_SETTINGS.defaultShippingFee,
    };
  }, [initialValues]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError: setFieldError,
    setFocus,
    formState: { errors, isDirty },
  } = useForm<ShippingSettingsFormValues>({
    resolver: zodResolver(
      shippingSettingsSchema,
    ) as Resolver<ShippingSettingsFormValues>,
    defaultValues: defaults,
  });

  const reasonOptions =
    (useWatch({ control, name: "replaceReasonOptions" }) as
      | string[]
      | undefined) ?? [];

  const watched = useWatch({ control });
  const method =
    watched.method === "flat_rate" ||
    watched.method === "free" ||
    watched.method === "percentage" ||
    watched.method === "zone"
      ? watched.method
      : "flat_rate";
  const deliveryOn = Boolean(watched.enabled);
  const fulfillmentMode: FulfillmentMode =
    watched.fulfillmentMode === "courier_api" ? "courier_api" : "auto_days";
  const returnPolicy: ReturnPolicy =
    watched.returnPolicy === "no_replace" ||
    watched.returnPolicy === "replace_only"
      ? watched.returnPolicy
      : "no_return_refund";
  const showFlatFields = method === "flat_rate" || method === "zone";
  const showPercentage = method === "percentage";
  const showFreeThreshold = method === "flat_rate" || method === "zone";
  const locked = !canUpdate;

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
        <section
          className={`${adminCard()} ${adminCardPadding()} ${adminCardSpanFull()}`}
          style={adminStackStyle}
        >
          <div>
            <h2 className={adminSectionTitle()}>Delivery</h2>
            <p className={adminSectionDesc()}>
              Turn delivery on, then choose how orders are completed and what
              customers see for returns.
            </p>
          </div>
          <Controller
            name="enabled"
            control={control}
            render={({ field }) => (
              <AdminToggle
                variant="row"
                checked={Boolean(field.value)}
                disabled={locked}
                label={
                  deliveryOn
                    ? "Delivery is on for this store"
                    : "Delivery is off"
                }
                onChange={field.onChange}
              />
            )}
          />
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()} ${adminCardSpanFull()}`}
          style={{
            ...adminStackStyle,
            opacity: deliveryOn ? 1 : 0.5,
            pointerEvents: deliveryOn ? "auto" : "none",
          }}
        >
          <div>
            <h2 className={adminSectionTitle()}>How orders become Delivered</h2>
            <p className={adminSectionDesc()}>
              Pick one flow for this store. Only the selected option runs.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {FULFILLMENT_MODE_OPTIONS.map((option) => (
              <ChoiceCard
                key={option.value}
                selected={fulfillmentMode === option.value}
                disabled={locked || !deliveryOn}
                title={option.title}
                description={option.description}
                badge={option.badge}
                onSelect={() => {
                  setValue("fulfillmentMode", option.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  if (
                    option.value === "auto_days" &&
                    (watched.autoDeliverAfterDays == null ||
                      Number(watched.autoDeliverAfterDays) < 1)
                  ) {
                    setValue("autoDeliverAfterDays", 7, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }
                }}
              />
            ))}
          </div>

          {fulfillmentMode === "auto_days" ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <TextField
                label="Mark delivered after (days)"
                type="number"
                fullWidth
                disabled={locked || !deliveryOn}
                placeholder="7"
                helperText="Recommended 5–7. After you mark Shipped, status becomes Delivered automatically."
                error={Boolean(errors.autoDeliverAfterDays)}
                {...register("autoDeliverAfterDays")}
              />
              <FieldError message={errors.autoDeliverAfterDays?.message} />
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">
              Courier API mode: use tracking on each order. Partner API connect
              can be added later — auto-deliver is off while this is selected.
            </div>
          )}
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()} ${adminCardSpanFull()}`}
          style={adminStackStyle}
        >
          <div>
            <h2 className={adminSectionTitle()}>Return & replace policy</h2>
            <p className={adminSectionDesc()}>
              Shown on the product page and order screens. Products can override
              this later if needed.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {RETURN_POLICY_OPTIONS.map((option) => (
              <ChoiceCard
                key={option.value}
                selected={returnPolicy === option.value}
                disabled={locked}
                title={option.title}
                description={option.description}
                onSelect={() => {
                  setValue("returnPolicy", option.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  if (option.value !== "replace_only") {
                    setValue("replacePhotoRequired", false, {
                      shouldDirty: true,
                    });
                  }
                }}
              />
            ))}
          </div>
          <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-foreground)]">
            Customers will see:{" "}
            <span className="font-semibold">{returnPolicyLabel(returnPolicy)}</span>
          </p>
          {returnPolicy === "replace_only" ? (
            <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <Controller
                name="replacePhotoRequired"
                control={control}
                render={({ field }) => (
                  <AdminToggle
                    variant="row"
                    checked={Boolean(field.value)}
                    disabled={locked}
                    label="Require photo for replace requests"
                    description="Off by default to save free-tier storage. Turn on only if you need evidence (max 1 MB per photo)."
                    onChange={field.onChange}
                  />
                )}
              />

              <div className={adminFieldsGrid()}>
                <Controller
                  name="replaceWindowHours"
                  control={control}
                  render={({ field }) => (
                    <AdminSelect
                      label="Replace window after delivery"
                      disabled={locked}
                      value={String(coerceReplaceWindowHours(field.value))}
                      onChange={(next) => field.onChange(Number(next))}
                      helperText="Customers can request a replacement only within this time after Delivered."
                      options={REPLACE_WINDOW_HOURS.map((hours) => ({
                        value: String(hours),
                        label:
                          hours === 168
                            ? "7 days (168 hours)"
                            : `${hours} hours`,
                      }))}
                    />
                  )}
                />
                <Controller
                  name="replaceMaxAttempts"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Max attempts per item"
                      type="number"
                      fullWidth
                      disabled={locked}
                      value={coerceReplaceMaxAttempts(field.value)}
                      onChange={(event) =>
                        field.onChange(
                          coerceReplaceMaxAttempts(event.target.value),
                        )
                      }
                      helperText="How many times a customer may request replace for the same line (1–5)."
                      slotProps={{ htmlInput: { min: 1, max: 5 } }}
                    />
                  )}
                />
              </div>
              <FieldError message={errors.replaceWindowHours?.message} />
              <FieldError message={errors.replaceMaxAttempts?.message} />

              <div>
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  Reason options
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  Shown in the customer request dialog. Always keep an Other
                  option so shoppers can write their own.
                </p>
                <ul className="mt-3 space-y-2">
                  {reasonOptions.map((option, index) => {
                    const isOther = isOtherReplaceReason(option);
                    return (
                      <li
                        key={`${index}-${option}`}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <TextField
                          size="small"
                          fullWidth
                          disabled={locked || isOther}
                          value={option}
                          onChange={(event) => {
                            const next = [...reasonOptions];
                            next[index] = event.target.value;
                            setValue(
                              "replaceReasonOptions",
                              coerceReplaceReasonOptions(next),
                              { shouldDirty: true },
                            );
                          }}
                          className="min-w-[12rem] flex-1"
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={locked || index === 0}
                            className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs disabled:opacity-40"
                            onClick={() => {
                              if (index === 0) return;
                              const next = [...reasonOptions];
                              const tmp = next[index - 1]!;
                              next[index - 1] = next[index]!;
                              next[index] = tmp;
                              setValue(
                                "replaceReasonOptions",
                                coerceReplaceReasonOptions(next),
                                { shouldDirty: true },
                              );
                            }}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            disabled={
                              locked || index >= reasonOptions.length - 1
                            }
                            className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs disabled:opacity-40"
                            onClick={() => {
                              if (index >= reasonOptions.length - 1) return;
                              const next = [...reasonOptions];
                              const tmp = next[index + 1]!;
                              next[index + 1] = next[index]!;
                              next[index] = tmp;
                              setValue(
                                "replaceReasonOptions",
                                coerceReplaceReasonOptions(next),
                                { shouldDirty: true },
                              );
                            }}
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            disabled={
                              locked ||
                              isOther ||
                              reasonOptions.filter(
                                (item) => !isOtherReplaceReason(item),
                              ).length <= 1
                            }
                            className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs text-red-700 disabled:opacity-40"
                            onClick={() => {
                              const next = reasonOptions.filter(
                                (_, i) => i !== index,
                              );
                              setValue(
                                "replaceReasonOptions",
                                coerceReplaceReasonOptions(next),
                                { shouldDirty: true },
                              );
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  disabled={locked || reasonOptions.length >= 12}
                  className="mt-3 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-40"
                  onClick={() => {
                    const withoutOther = reasonOptions.filter(
                      (item) => !isOtherReplaceReason(item),
                    );
                    setValue(
                      "replaceReasonOptions",
                      coerceReplaceReasonOptions([
                        ...withoutOther,
                        "New reason",
                        "Other",
                      ]),
                      { shouldDirty: true },
                    );
                  }}
                >
                  Add reason
                </button>
                <FieldError message={errors.replaceReasonOptions?.message} />
              </div>
            </div>
          ) : null}
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={{
            ...adminStackStyle,
            opacity: deliveryOn ? 1 : 0.5,
            pointerEvents: deliveryOn ? "auto" : "none",
          }}
        >
          <div>
            <h2 className={adminSectionTitle()}>Delivery price</h2>
            <p className={adminSectionDesc()}>
              What customers pay for delivery at checkout.
            </p>
          </div>
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <div>
                <AdminSelect
                  label="Pricing style"
                  required
                  disabled={locked || !deliveryOn}
                  error={Boolean(errors.method)}
                  value={
                    field.value === "flat_rate" ||
                    field.value === "free" ||
                    field.value === "percentage" ||
                    field.value === "zone"
                      ? field.value
                      : "flat_rate"
                  }
                  onChange={field.onChange}
                  name={field.name}
                  options={[
                    {
                      value: "flat_rate",
                      label: "Fixed fee (free above a certain amount)",
                    },
                    { value: "free", label: "Always free" },
                    { value: "percentage", label: "% of order total" },
                    {
                      value: "zone",
                      label: "By area (uses fixed fee for now)",
                    },
                  ]}
                />
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
                disabled={locked || !deliveryOn}
                error={Boolean(errors.defaultShippingFee)}
                {...register("defaultShippingFee")}
              />
              <FieldError message={errors.defaultShippingFee?.message} />
            </div>
          ) : null}

          {showFreeThreshold ? (
            <div>
              <TextField
                label={`Free delivery from (${currency})`}
                type="number"
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                disabled={locked || !deliveryOn}
                error={Boolean(errors.freeShippingThreshold)}
                helperText={`Example: ${formatMoney(500, currency)}+ gets free delivery.`}
                {...register("freeShippingThreshold")}
              />
              <FieldError message={errors.freeShippingThreshold?.message} />
            </div>
          ) : null}

          {showPercentage ? (
            <div>
              <TextField
                label="Delivery % of order"
                type="number"
                fullWidth
                slotProps={{ htmlInput: { min: 0, max: 100, step: "0.01" } }}
                disabled={locked || !deliveryOn}
                error={Boolean(errors.percentageRate)}
                {...register("percentageRate")}
              />
              <FieldError message={errors.percentageRate?.message} />
            </div>
          ) : null}
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={{
            ...adminStackStyle,
            opacity: deliveryOn ? 1 : 0.5,
            pointerEvents: deliveryOn ? "auto" : "none",
          }}
        >
          <div>
            <h2 className={adminSectionTitle()}>Delivery time</h2>
            <p className={adminSectionDesc()}>
              Shown so customers know when to expect the parcel.
            </p>
          </div>
          <div className={adminFieldsGrid(2)}>
            <TextField
              label="Fastest (days)"
              type="number"
              fullWidth
              disabled={locked || !deliveryOn}
              {...register("estimatedDeliveryMinDays")}
            />
            <TextField
              label="Longest (days)"
              type="number"
              fullWidth
              disabled={locked || !deliveryOn}
              {...register("estimatedDeliveryMaxDays")}
            />
          </div>
          <TextField
            label="Customer message (optional)"
            fullWidth
            disabled={locked || !deliveryOn}
            placeholder="Delivered in 3–7 working days across India"
            {...register("estimatedDeliveryLabel")}
          />

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              Price preview
            </p>
            {!deliveryOn ? (
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Turn delivery on to see examples.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between gap-2">
                  <span className="text-[var(--color-muted)]">
                    Order {formatMoney(preview.sampleBelow, currency)}
                  </span>
                  <span className="font-semibold">
                    {preview.below
                      ? formatMoney(preview.below.shipping.major, currency)
                      : "—"}
                  </span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-[var(--color-muted)]">
                    Order {formatMoney(preview.sampleAt, currency)}
                  </span>
                  <span className="font-semibold">
                    {preview.at
                      ? formatMoney(preview.at.shipping.major, currency)
                      : "—"}
                  </span>
                </li>
              </ul>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}
