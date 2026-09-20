"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
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
import { AdminReasonOptionsEditor } from "@/features/admin/ui/AdminReasonOptionsEditor";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import {
  adminCard,
  adminFieldsGrid,
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
  coerceCancelReasonOptions,
  coerceReplaceMaxAttempts,
  coerceReplaceReasonOptions,
  coerceReplaceWindowHours,
  isOtherCancelReason,
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
  courierSecrets?: {
    delhiveryToken: boolean;
    bluedartLicence: boolean;
    bluedartApiKey: boolean;
    bluedartApiSecret: boolean;
  };
}

function Section({
  title,
  hint,
  children,
  dimmed,
  badge,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  dimmed?: boolean;
  badge?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        adminCard(),
        "p-3.5 md:p-4",
        dimmed && "opacity-50",
        className,
      )}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        width: "100%",
        pointerEvents: dimmed ? "none" : undefined,
      }}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
            {title}
          </h2>
          {hint ? (
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-muted)]">
              {hint}
            </p>
          ) : null}
        </div>
        {badge ? (
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {badge}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
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
        "rounded-xl border px-3 py-2.5 text-left transition",
        "outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-card))] shadow-[inset_0_0_0_1px_var(--color-primary)]"
          : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[color-mix(in_srgb,var(--color-foreground)_18%,var(--color-border))]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
          {title}
        </span>
        <span
          className={cn(
            "inline-flex h-3.5 w-3.5 shrink-0 rounded-full border-2",
            selected
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
              : "border-[var(--color-border)]",
          )}
          aria-hidden
        />
      </div>
      {badge ? (
        <span className="mt-1 inline-block rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          {badge}
        </span>
      ) : null}
      <p className="mt-1 text-[11px] leading-snug text-[var(--color-muted)]">
        {description}
      </p>
    </button>
  );
}

const fieldSx = {
  "& .MuiInputBase-root": { fontSize: 13 },
  "& .MuiInputLabel-root": { fontSize: 13 },
  "& .MuiFormHelperText-root": { fontSize: 11, marginTop: "4px" },
} as const;

export function ShippingSettingsForm({
  initialValues,
  currency,
  canUpdate,
  courierSecrets = {
    delhiveryToken: false,
    bluedartLicence: false,
    bluedartApiKey: false,
    bluedartApiSecret: false,
  },
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
      cancelReasonOptions: coerceCancelReasonOptions(
        initialValues.cancelReasonOptions,
      ),
      courierDefaultProvider:
        initialValues.courierDefaultProvider === "bluedart"
          ? "bluedart"
          : "delhivery",
      courierSandbox: initialValues.courierSandbox !== false,
      delhiveryApiToken: initialValues.delhiveryApiToken ?? null,
      delhiveryClientName: initialValues.delhiveryClientName ?? null,
      bluedartLoginId: initialValues.bluedartLoginId ?? null,
      bluedartLicenceKey: initialValues.bluedartLicenceKey ?? null,
      bluedartApiKey: initialValues.bluedartApiKey ?? null,
      bluedartApiSecret: initialValues.bluedartApiSecret ?? null,
      bluedartOriginArea: initialValues.bluedartOriginArea ?? null,
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

  const cancelReasonOptions =
    (useWatch({ control, name: "cancelReasonOptions" }) as
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
      className="flex w-full flex-col gap-3"
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

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Delivery master + fulfillment */}
        <Section
          title="Delivery"
          hint="Master switch for checkout delivery fees and fulfillment."
          className="lg:col-span-2"
        >
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
                description={
                  deliveryOn
                    ? "Fees and delivery estimates show at checkout."
                    : "Turn on to configure pricing and delivery time."
                }
                onChange={field.onChange}
              />
            )}
          />
        </Section>

        <Section
          title="Mark as delivered"
          hint="Only the selected flow runs for this store."
          dimmed={!deliveryOn}
        >
          <div className="grid gap-2 sm:grid-cols-2">
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
            <div>
              <TextField
                label="Days after shipped"
                type="number"
                size="small"
                fullWidth
                disabled={locked || !deliveryOn}
                placeholder="7"
                helperText="Recommended 5–7. Auto-marks Delivered after Shipped."
                error={Boolean(errors.autoDeliverAfterDays)}
                sx={fieldSx}
                {...register("autoDeliverAfterDays")}
              />
              <FieldError message={errors.autoDeliverAfterDays?.message} />
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p className="text-[11px] leading-snug text-[var(--color-muted)]">
                Enable one courier for this store. Create AWB and sync tracking
                from orders. Leave secret fields blank to keep saved values.
              </p>
              <div className={adminFieldsGrid(2)}>
                <Controller
                  name="courierDefaultProvider"
                  control={control}
                  render={({ field }) => (
                    <AdminSelect
                      label="Active courier"
                      disabled={locked || !deliveryOn}
                      value={
                        field.value === "bluedart" ? "bluedart" : "delhivery"
                      }
                      onChange={(next) =>
                        field.onChange(
                          next === "bluedart" ? "bluedart" : "delhivery",
                        )
                      }
                      helperText="Only one service runs at a time."
                      options={[
                        { value: "delhivery", label: "Delhivery" },
                        { value: "bluedart", label: "Blue Dart" },
                      ]}
                    />
                  )}
                />
                <Controller
                  name="courierSandbox"
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      variant="row"
                      checked={Boolean(field.value)}
                      disabled={locked || !deliveryOn}
                      label="Sandbox / staging"
                      description="ON = Delhivery staging URLs. OFF = live production. Use the matching token (staging vs live)."
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              {(watched.courierDefaultProvider === "bluedart"
                ? "bluedart"
                : "delhivery") === "delhivery" ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[var(--color-foreground)]">
                      Delhivery credentials
                    </p>
                    {courierSecrets.delhiveryToken ? (
                      <span className="rounded-full border border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-card))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-success)]">
                        Token saved
                      </span>
                    ) : (
                      <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                        No token yet
                      </span>
                    )}
                  </div>
                  <div className={adminFieldsGrid(2)}>
                    <TextField
                      label="API token"
                      size="small"
                      fullWidth
                      type="password"
                      autoComplete="off"
                      disabled={locked || !deliveryOn}
                      placeholder={
                        courierSecrets.delhiveryToken
                          ? "•••••••• (saved — leave blank to keep)"
                          : "Paste API token"
                      }
                      helperText={
                        courierSecrets.delhiveryToken
                          ? "Token is stored securely and never shown again. Paste a new one only to replace it."
                          : "From Delhivery One → Settings → API Setup. Paste once and Save."
                      }
                      sx={fieldSx}
                      {...register("delhiveryApiToken")}
                    />
                    <TextField
                      label="Client / warehouse name"
                      size="small"
                      fullWidth
                      disabled={locked || !deliveryOn}
                      helperText="Must match Delhivery registered pickup name."
                      sx={fieldSx}
                      {...register("delhiveryClientName")}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[var(--color-foreground)]">
                      Blue Dart credentials
                    </p>
                    {courierSecrets.bluedartLicence &&
                    courierSecrets.bluedartApiKey &&
                    courierSecrets.bluedartApiSecret ? (
                      <span className="rounded-full border border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-card))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-success)]">
                        Keys saved
                      </span>
                    ) : (
                      <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                        Keys incomplete
                      </span>
                    )}
                  </div>
                  <div className={adminFieldsGrid(2)}>
                    <TextField
                      label="Login ID"
                      size="small"
                      fullWidth
                      disabled={locked || !deliveryOn}
                      sx={fieldSx}
                      {...register("bluedartLoginId")}
                    />
                    <TextField
                      label="Origin area"
                      size="small"
                      fullWidth
                      disabled={locked || !deliveryOn}
                      helperText="e.g. DEL — must match pincode region."
                      sx={fieldSx}
                      {...register("bluedartOriginArea")}
                    />
                    <TextField
                      label="Licence key"
                      size="small"
                      fullWidth
                      type="password"
                      autoComplete="off"
                      disabled={locked || !deliveryOn}
                      placeholder={
                        courierSecrets.bluedartLicence
                          ? "•••••••• (saved — leave blank to keep)"
                          : "Paste licence key"
                      }
                      sx={fieldSx}
                      {...register("bluedartLicenceKey")}
                    />
                    <TextField
                      label="API key (Client ID)"
                      size="small"
                      fullWidth
                      type="password"
                      autoComplete="off"
                      disabled={locked || !deliveryOn}
                      placeholder={
                        courierSecrets.bluedartApiKey
                          ? "•••••••• (saved — leave blank to keep)"
                          : "Paste API key"
                      }
                      sx={fieldSx}
                      {...register("bluedartApiKey")}
                    />
                    <TextField
                      label="API secret"
                      size="small"
                      fullWidth
                      type="password"
                      autoComplete="off"
                      disabled={locked || !deliveryOn}
                      placeholder={
                        courierSecrets.bluedartApiSecret
                          ? "•••••••• (saved — leave blank to keep)"
                          : "Paste API secret"
                      }
                      sx={fieldSx}
                      {...register("bluedartApiSecret")}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        <Section
          title="Price & ETA"
          hint="Checkout fee and the delivery window customers see."
          dimmed={!deliveryOn}
        >
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
                      label: "Fixed fee (free above threshold)",
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

          <div className={adminFieldsGrid(2)}>
            {showFlatFields ? (
              <div>
                <TextField
                  label={`Fee (${currency})`}
                  type="number"
                  size="small"
                  fullWidth
                  required
                  slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                  disabled={locked || !deliveryOn}
                  error={Boolean(errors.defaultShippingFee)}
                  sx={fieldSx}
                  {...register("defaultShippingFee")}
                />
                <FieldError message={errors.defaultShippingFee?.message} />
              </div>
            ) : null}
            {showFreeThreshold ? (
              <div>
                <TextField
                  label={`Free from (${currency})`}
                  type="number"
                  size="small"
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                  disabled={locked || !deliveryOn}
                  error={Boolean(errors.freeShippingThreshold)}
                  sx={fieldSx}
                  {...register("freeShippingThreshold")}
                />
                <FieldError message={errors.freeShippingThreshold?.message} />
              </div>
            ) : null}
            {showPercentage ? (
              <div>
                <TextField
                  label="Delivery %"
                  type="number"
                  size="small"
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, max: 100, step: "0.01" } }}
                  disabled={locked || !deliveryOn}
                  error={Boolean(errors.percentageRate)}
                  sx={fieldSx}
                  {...register("percentageRate")}
                />
                <FieldError message={errors.percentageRate?.message} />
              </div>
            ) : null}
            <TextField
              label="Fastest (days)"
              type="number"
              size="small"
              fullWidth
              disabled={locked || !deliveryOn}
              sx={fieldSx}
              {...register("estimatedDeliveryMinDays")}
            />
            <TextField
              label="Longest (days)"
              type="number"
              size="small"
              fullWidth
              disabled={locked || !deliveryOn}
              sx={fieldSx}
              {...register("estimatedDeliveryMaxDays")}
            />
          </div>

          <TextField
            label="Customer message (optional)"
            size="small"
            fullWidth
            disabled={locked || !deliveryOn}
            placeholder="Delivered in 3–7 working days"
            sx={fieldSx}
            {...register("estimatedDeliveryLabel")}
          />

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Fee preview
            </p>
            {!deliveryOn ? (
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                Turn delivery on to preview.
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1 text-[12px]">
                <li className="flex justify-between gap-2">
                  <span className="text-[var(--color-muted)]">
                    {formatMoney(preview.sampleBelow, currency)}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {preview.below
                      ? formatMoney(preview.below.shipping.major, currency)
                      : "—"}
                  </span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-[var(--color-muted)]">
                    {formatMoney(preview.sampleAt, currency)}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {preview.at
                      ? formatMoney(preview.at.shipping.major, currency)
                      : "—"}
                  </span>
                </li>
              </ul>
            )}
          </div>
        </Section>

        {/* Returns */}
        <Section
          title="Return & replace"
          hint="Default policy on product and order screens."
          className="lg:col-span-2"
        >
          <div className="grid gap-2 sm:grid-cols-3">
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
          <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] text-[var(--color-foreground)]">
            Customers see:{" "}
            <span className="font-semibold">{returnPolicyLabel(returnPolicy)}</span>
          </p>

          {returnPolicy === "replace_only" ? (
            <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <Controller
                name="replacePhotoRequired"
                control={control}
                render={({ field }) => (
                  <AdminToggle
                    variant="row"
                    checked={Boolean(field.value)}
                    disabled={locked}
                    label="Require photo"
                    description="Off by default (saves storage). Max 1 MB."
                    onChange={field.onChange}
                  />
                )}
              />
              <div className={adminFieldsGrid(2)}>
                <Controller
                  name="replaceWindowHours"
                  control={control}
                  render={({ field }) => (
                    <AdminSelect
                      label="Replace window"
                      disabled={locked}
                      value={String(coerceReplaceWindowHours(field.value))}
                      onChange={(next) => field.onChange(Number(next))}
                      helperText="After Delivered."
                      options={REPLACE_WINDOW_HOURS.map((hours) => ({
                        value: String(hours),
                        label:
                          hours === 168
                            ? "7 days (168h)"
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
                      label="Max attempts / item"
                      type="number"
                      size="small"
                      fullWidth
                      disabled={locked}
                      value={coerceReplaceMaxAttempts(field.value)}
                      onChange={(event) =>
                        field.onChange(
                          coerceReplaceMaxAttempts(event.target.value),
                        )
                      }
                      helperText="1–5 per line item"
                      slotProps={{ htmlInput: { min: 1, max: 5 } }}
                      sx={fieldSx}
                    />
                  )}
                />
              </div>
              <FieldError message={errors.replaceWindowHours?.message} />
              <FieldError message={errors.replaceMaxAttempts?.message} />
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-[var(--color-foreground)]">
                  Replace reasons
                </p>
                <AdminReasonOptionsEditor
                  options={reasonOptions}
                  locked={locked}
                  isOther={isOtherReplaceReason}
                  coerce={coerceReplaceReasonOptions}
                  onChange={(next) =>
                    setValue("replaceReasonOptions", next, {
                      shouldDirty: true,
                    })
                  }
                  error={errors.replaceReasonOptions?.message}
                />
              </div>
            </div>
          ) : null}
        </Section>

        <Section
          title="COD cancel reasons"
          hint="Asked when a shopper cancels COD before shipping."
          badge="Customer dialog"
          className="lg:col-span-2"
        >
          <AdminReasonOptionsEditor
            options={cancelReasonOptions}
            locked={locked}
            isOther={isOtherCancelReason}
            coerce={coerceCancelReasonOptions}
            onChange={(next) =>
              setValue("cancelReasonOptions", next, { shouldDirty: true })
            }
            error={errors.cancelReasonOptions?.message}
          />
        </Section>
      </div>
    </form>
  );
}
