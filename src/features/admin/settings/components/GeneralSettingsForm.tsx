"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { saveGeneralSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  DEFAULT_GENERAL_SETTINGS,
  generalSettingsSchema,
  type GeneralSettingsFormValues,
} from "@/features/admin/settings/schemas";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  STORE_COUNTRIES,
  STORE_CURRENCIES,
  STORE_LOCALES,
  STORE_TIMEZONES,
  INDIA_STATES,
  citiesForState,
  defaultsForCountry,
  normalizeSelectValue,
} from "@/features/admin/settings/location-options";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  DEFAULT_STORE_COUNTRY,
  PHONE_COUNTRY_CODES,
} from "@/lib/phone";
import {
  adminCard,
  adminCardsGrid,
  adminCardSpanFull,
  adminFieldsGrid,
} from "@/features/admin/ui/admin-classes";
import { FieldError } from "@/features/admin/ui/FieldError";
import { StorePhoneField } from "@/features/admin/ui/StorePhoneField";
import { adminImageMaxMbOptions } from "@/features/media/upload-limits";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import { whatsappDisplayValue } from "@/features/admin/settings/validation";
import {
  exampleOrderNumber,
  suggestOrderNumberPrefixFromStoreName,
} from "@/features/orders/order-number-prefix";
import { StorefrontLoaderMark } from "@/components/ui/StorefrontLoaderMark";import {
  STOREFRONT_LOADER_STYLES,
  STOREFRONT_LOADER_STYLE_META,
  type StorefrontLoaderStyle,
} from "@/components/ui/storefront-loader";
import { cn } from "@/lib/cn";

interface GeneralSettingsFormProps {
  initialValues: GeneralSettingsFormValues;
  canUpdate: boolean;
}

function Section({
  title,
  hint,
  children,
  className,
  badge,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  badge?: string;
}) {
  return (
    <section
      className={cn(adminCard(), "p-3 md:p-3.5", className)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
        width: "100%",
      }}
    >
      <header className="flex flex-wrap items-start justify-between gap-1.5">
        <div className="min-w-0">
          <h2 className="text-[12px] font-semibold tracking-tight text-[var(--color-foreground)]">
            {title}
          </h2>
          {hint ? (
            <p className="mt-0.5 text-[10px] leading-snug text-[var(--color-muted)]">
              {hint}
            </p>
          ) : null}
        </div>
        {badge ? (
          <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {badge}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
  helperText,
  required,
  error,
  allowCustom,
  customLabel = "Other (type below)",
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string } | string>;
  onChange: (value: string) => void;
  disabled?: boolean;
  helperText?: string;
  required?: boolean;
  error?: boolean;
  allowCustom?: boolean;
  customLabel?: string;
}) {
  const normalized = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  );
  const values = normalized.map((o) => o.value);
  const hasValue = values.includes(value);
  const selectValue = hasValue
    ? value
    : value
      ? value
      : allowCustom
        ? "__custom__"
        : (values[0] ?? "");

  const composed = [
    ...(!hasValue && value ? [{ value, label: `${value} (saved)` }] : []),
    ...normalized,
    ...(allowCustom ? [{ value: "__custom__", label: customLabel }] : []),
  ];

  return (
    <AdminSelect
      label={label}
      required={required}
      disabled={disabled}
      error={error}
      helperText={helperText}
      value={selectValue}
      options={composed}
      onChange={(next) => {
        if (next === "__custom__") {
          onChange("");
          return;
        }
        onChange(next);
      }}
    />
  );
}

export function GeneralSettingsForm({
  initialValues,
  canUpdate,
}: GeneralSettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [customCity, setCustomCity] = useState(false);

  const defaults = useMemo(() => {
    const country = normalizeSelectValue(
      initialValues.country,
      STORE_COUNTRIES.map((c) => c.value),
      DEFAULT_STORE_COUNTRY,
    );
    const countryDefaults = defaultsForCountry(country);
    return {
      ...DEFAULT_GENERAL_SETTINGS,
      ...initialValues,
      country: initialValues.country?.trim() || DEFAULT_STORE_COUNTRY,
      phoneCountryCode:
        initialValues.phoneCountryCode?.trim() ||
        countryDefaults.phoneCountryCode ||
        DEFAULT_PHONE_COUNTRY_CODE,
      currency: normalizeSelectValue(
        initialValues.currency,
        STORE_CURRENCIES.map((c) => c.value),
        countryDefaults.currency,
      ),
      timezone: normalizeSelectValue(
        initialValues.timezone,
        STORE_TIMEZONES.map((t) => t.value),
        countryDefaults.timezone,
      ),
      defaultLocale: normalizeSelectValue(
        initialValues.defaultLocale,
        STORE_LOCALES.map((l) => l.value),
        countryDefaults.defaultLocale,
      ),
      socialWhatsapp: whatsappDisplayValue(
        initialValues.socialWhatsapp ?? "",
        initialValues.phoneCountryCode?.trim() ||
          countryDefaults.phoneCountryCode ||
          DEFAULT_PHONE_COUNTRY_CODE,
      ),
      whatsappFloatEnabled: initialValues.whatsappFloatEnabled ?? false,
      adminImageMaxMb: initialValues.adminImageMaxMb ?? 5,
      adminReelVideoMaxMb: initialValues.adminReelVideoMaxMb ?? 25,
    } satisfies GeneralSettingsFormValues;
  }, [initialValues]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setError: setFieldError,
    setFocus,
    formState: { isDirty },
  } = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(
      generalSettingsSchema,
    ) as Resolver<GeneralSettingsFormValues>,
    defaultValues: defaults,
  });

  const country = useWatch({ control, name: "country" }) ?? DEFAULT_STORE_COUNTRY;
  const phoneCountryCode =
    useWatch({ control, name: "phoneCountryCode" }) ?? DEFAULT_PHONE_COUNTRY_CODE;
  const displayName = useWatch({ control, name: "displayName" }) ?? "";
  const state = useWatch({ control, name: "state" }) ?? "";
  const city = useWatch({ control, name: "city" }) ?? "";
  const adminImageMaxMb = useWatch({ control, name: "adminImageMaxMb" }) ?? 5;
  const isIndia = country === "India";
  const cityOptions = isIndia ? citiesForState(state) : [];
  const cityInList = cityOptions.includes(city);
  const showCityText =
    customCity || (Boolean(city) && !cityInList) || cityOptions.length === 0;

  /** When false, prefix follows store name; true after the admin edits it. */
  const [orderPrefixManual, setOrderPrefixManual] = useState(() => {
    const suggested = suggestOrderNumberPrefixFromStoreName(
      initialValues.displayName,
    );
    const loaded = (initialValues.orderNumberPrefix || "ORD")
      .trim()
      .toUpperCase();
    return loaded !== "ORD" && loaded !== suggested;
  });

  const locked = !canUpdate || pending;

  useEffect(() => {
    if (orderPrefixManual || locked) return;
    const suggested = suggestOrderNumberPrefixFromStoreName(displayName);
    if (getValues("orderNumberPrefix") === suggested) return;
    setValue("orderNumberPrefix", suggested, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [displayName, orderPrefixManual, locked, getValues, setValue]);

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveGeneralSettingsAction(values);
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
      setSuccess(result.message);
      reset({
        ...values,
        socialWhatsapp: whatsappDisplayValue(values.socialWhatsapp ?? ""),
      });
      router.refresh();
    });
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-2.5"
    >
      <SettingsFormToolbar
        isDirty={isDirty}
        canUpdate={canUpdate}
        pending={pending}
        error={error}
        success={success}
        onSave={onSubmit}
        onCancel={() => {
          reset(defaults);
          setError(null);
          setSuccess(null);
          setCustomCity(false);
          const suggested = suggestOrderNumberPrefixFromStoreName(
            defaults.displayName,
          );
          const loaded = (defaults.orderNumberPrefix || "ORD")
            .trim()
            .toUpperCase();
          setOrderPrefixManual(loaded !== "ORD" && loaded !== suggested);
        }}
        onResetDefaults={() => {
          const d = defaultsForCountry(DEFAULT_STORE_COUNTRY);
          const nextName = DEFAULT_GENERAL_SETTINGS.displayName;
          const suggested = suggestOrderNumberPrefixFromStoreName(nextName);
          reset({
            ...DEFAULT_GENERAL_SETTINGS,
            country: DEFAULT_STORE_COUNTRY,
            timezone: d.timezone,
            defaultLocale: d.defaultLocale,
            currency: d.currency,
            phoneCountryCode: d.phoneCountryCode,
            orderNumberPrefix: suggested,
          });
          setOrderPrefixManual(false);
          setSuccess(null);
          setCustomCity(false);
        }}
      />

      <div className={cn(adminCardsGrid(), "!gap-2.5")}>
        <Section
          title="Store identity"
          hint="Name & WhatsApp. Contact details → Content → Contact."
        >
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="displayName"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Store name"
                    fullWidth
                    size="small"
                    required
                    disabled={locked}
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error ? undefined : "Shown in header & emails"
                    }
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="legalName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Legal name"
                  fullWidth
                  size="small"
                  disabled={locked}
                  helperText="Optional · invoices"
                />
              )}
            />
            <Controller
              name="socialWhatsapp"
              control={control}
              render={({ fieldState }) => (
                <div className="sm:col-span-2 space-y-3">
                  <div>
                    <StorePhoneField
                      name="socialWhatsapp"
                      control={control}
                      countryCode={phoneCountryCode}
                      label="WhatsApp"
                      disabled={locked}
                      error={Boolean(fieldState.error)}
                      helperText={
                        fieldState.error
                          ? undefined
                          : "10-digit number · dial code follows Phone dial code below"
                      }
                    />
                    <FieldError message={fieldState.error?.message} />
                  </div>
                  <Controller
                    name="whatsappFloatEnabled"
                    control={control}
                    render={({ field }) => (
                      <AdminToggle
                        variant="row"
                        label="Floating WhatsApp button"
                        description="Shows a fixed green chat button on the bottom-left of the storefront. Off by default."
                        checked={Boolean(field.value)}
                        disabled={locked}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              )}
            />          </div>
        </Section>

        <Section
          title="Locale & dial code"
          hint="Currency, language, timezone, phone dial code, and order number prefix."
        >
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <SelectField
                  label="Country"
                  disabled={locked}
                  value={field.value || DEFAULT_STORE_COUNTRY}
                  options={[...STORE_COUNTRIES]}
                  onChange={(next) => {
                    field.onChange(next);
                    const d = defaultsForCountry(next);
                    setValue("timezone", d.timezone, { shouldDirty: true });
                    setValue("defaultLocale", d.defaultLocale, {
                      shouldDirty: true,
                    });
                    setValue("currency", d.currency, { shouldDirty: true });
                    setValue("phoneCountryCode", d.phoneCountryCode, {
                      shouldDirty: true,
                    });
                    if (next !== "India") {
                      setCustomCity(true);
                    }
                  }}
                  helperText="Sets locale defaults & dial code"
                />
              )}
            />
            <Controller
              name="phoneCountryCode"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <SelectField
                    label="Phone dial code"
                    disabled={locked}
                    value={field.value || DEFAULT_PHONE_COUNTRY_CODE}
                    options={[...PHONE_COUNTRY_CODES]}
                    onChange={field.onChange}
                    helperText="Contact, footer, signup, checkout"
                    error={Boolean(fieldState.error)}
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="currency"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <SelectField
                    label="Currency"
                    required
                    disabled={locked}
                    error={Boolean(fieldState.error)}
                    value={field.value}
                    options={[...STORE_CURRENCIES]}
                    onChange={field.onChange}
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="defaultLocale"
              control={control}
              render={({ field }) => (
                <SelectField
                  label="Language"
                  required
                  disabled={locked}
                  value={field.value}
                  options={[...STORE_LOCALES]}
                  onChange={field.onChange}
                  allowCustom
                />
              )}
            />
            <Controller
              name="timezone"
              control={control}
              render={({ field }) => (
                <div className="sm:col-span-2">
                  <SelectField
                    label="Timezone"
                    required
                    disabled={locked}
                    value={field.value}
                    options={[...STORE_TIMEZONES]}
                    onChange={field.onChange}
                    allowCustom
                  />
                </div>
              )}
            />
            <Controller
              name="orderNumberPrefix"
              control={control}
              render={({ field, fieldState }) => {
                const example = exampleOrderNumber(field.value);
                const suggested =
                  suggestOrderNumberPrefixFromStoreName(displayName);
                return (
                  <div className="sm:col-span-2">
                    <TextField
                      {...field}
                      label="Order number prefix"
                      fullWidth
                      size="small"
                      disabled={locked}
                      placeholder={suggested}
                      error={Boolean(fieldState.error)}
                      helperText={
                        fieldState.error?.message ??
                        (orderPrefixManual
                          ? "Custom prefix — edit freely. Existing orders keep their numbers."
                          : "Auto-filled from store name. Change it anytime if you prefer.")
                      }
                      onChange={(event) => {
                        setOrderPrefixManual(true);
                        field.onChange(event.target.value.toUpperCase());
                      }}
                    />
                    <FieldError message={fieldState.error?.message} />
                    <p className="mt-1.5 text-[12px] text-[var(--color-muted)]">
                      Example:{" "}
                      <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                        {example}
                      </span>
                    </p>
                    {orderPrefixManual && suggested !== field.value ? (
                      <button
                        type="button"
                        disabled={locked}
                        className="mt-1.5 text-[12px] font-medium text-[var(--color-primary)] underline-offset-2 hover:underline disabled:opacity-50"
                        onClick={() => {
                          setOrderPrefixManual(false);
                          setValue("orderNumberPrefix", suggested, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                      >
                        Use store name ({suggested})
                      </button>
                    ) : null}
                  </div>
                );
              }}
            />
          </div>
        </Section>

        <Section
          className={adminCardSpanFull()}
          title="Business address"
          hint="Used on /contact. Email & phones → Content → Contact."
        >
          <div className={adminFieldsGrid(3)}>
            <Controller
              name="postalCode"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="PIN / postal code"
                    fullWidth
                    size="small"
                    disabled={locked}
                    error={Boolean(fieldState.error)}
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            {isIndia ? (
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="State"
                    disabled={locked}
                    value={field.value}
                    options={[...INDIA_STATES]}
                    allowCustom
                    onChange={(next) => {
                      field.onChange(next);
                      const cities = citiesForState(next);
                      const currentCity = city;
                      if (cities.length && !cities.includes(currentCity)) {
                        setValue(
                          "city",
                          cities.includes("Rajkot") ? "Rajkot" : cities[0]!,
                          { shouldDirty: true },
                        );
                        setCustomCity(false);
                      }
                    }}
                  />
                )}
              />
            ) : (
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="State / region"
                    fullWidth
                    size="small"
                    disabled={locked}
                  />
                )}
              />
            )}
            {isIndia && !showCityText ? (
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="City"
                    disabled={locked}
                    value={field.value}
                    options={[...cityOptions]}
                    allowCustom
                    customLabel="Other city (type next)"
                    onChange={(next) => {
                      if (!next) {
                        setCustomCity(true);
                        field.onChange("");
                        return;
                      }
                      setCustomCity(false);
                      field.onChange(next);
                    }}
                  />
                )}
              />
            ) : (
              <Controller
                name="city"
                control={control}
                render={({ field, fieldState }) => (
                  <div>
                    <TextField
                      {...field}
                      label="City"
                      fullWidth
                      size="small"
                      disabled={locked}
                      error={Boolean(fieldState.error)}
                    />
                    <FieldError message={fieldState.error?.message} />
                  </div>
                )}
              />
            )}
            <div className="md:col-span-2 xl:col-span-2">
              <Controller
                name="addressLine1"
                control={control}
                render={({ field, fieldState }) => (
                  <div>
                    <TextField
                      {...field}
                      label="Street address"
                      fullWidth
                      size="small"
                      disabled={locked}
                      error={Boolean(fieldState.error)}
                    />
                    <FieldError message={fieldState.error?.message} />
                  </div>
                )}
              />
            </div>
            <Controller
              name="addressLine2"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Landmark / area"
                  fullWidth
                  size="small"
                  disabled={locked}
                />
              )}
            />
          </div>
        </Section>

        <Section
          title="Loading"
          hint="Storefront page loader."
        >
          <Controller
            name="storefrontLoaderStyle"
            control={control}
            render={({ field }) => (
              <div
                className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5"
                role="radiogroup"
                aria-label="Loader style"
              >
                {STOREFRONT_LOADER_STYLES.map((style) => {
                  const meta = STOREFRONT_LOADER_STYLE_META[style];
                  const selected = field.value === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={locked}
                      onClick={() =>
                        field.onChange(style as StorefrontLoaderStyle)
                      }
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-colors",
                        selected
                          ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] ring-1 ring-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]",
                        locked && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <StorefrontLoaderMark style={style} size={22} />
                      <span className="text-[10px] font-semibold text-[var(--color-foreground)]">
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          />
          <Controller
            name="storefrontLoaderLabel"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <TextField
                  {...field}
                  label="Loading label"
                  placeholder="Loading…"
                  fullWidth
                  size="small"
                  disabled={locked}
                  error={Boolean(fieldState.error)}
                />
                <FieldError message={fieldState.error?.message} />
              </div>
            )}
          />
        </Section>

        <Section
          title="Media limits"
          hint="Admin image upload cap."
        >
          <div className="rounded-lg border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                  <ImageOutlinedIcon sx={{ fontSize: 14 }} />
                </span>
                <p className="text-[11px] font-semibold text-[var(--color-foreground)]">
                  Images
                </p>
              </div>
              <span className="shrink-0 rounded-md border border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-[var(--color-primary)]">
                {adminImageMaxMb} MB
              </span>
            </div>
            <Controller
              name="adminImageMaxMb"
              control={control}
              render={({ field }) => (
                <AdminSelect
                  label="Max size"
                  required
                  disabled={locked}
                  value={String(field.value)}
                  onChange={(next) => field.onChange(Number(next))}
                  name={field.name}
                  helperText="1–10 MB"
                  options={adminImageMaxMbOptions()}
                />
              )}
            />
          </div>
        </Section>

        <Section
          className={adminCardSpanFull()}
          title="Business & accounts"
          hint="Tax IDs and checkout sign-in rules."
        >
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="businessRegistrationNumber"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Registration number"
                  fullWidth
                  size="small"
                  disabled={locked}
                  helperText="Company / FSSAI number"
                />
              )}
            />
            <Controller
              name="taxId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Tax ID / GSTIN"
                  fullWidth
                  size="small"
                  disabled={locked}
                />
              )}
            />
            <Controller
              name="registrationEnabled"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={locked}
                  label="Customer accounts"
                  description="Allow shoppers to register"
                  variant="row"
                />
              )}
            />
            <Controller
              name="checkoutGuestAllowed"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={locked}
                  label="Guest checkout"
                  description="Buy without an account"
                  variant="row"
                />
              )}
            />
          </div>
        </Section>

        <Section
          className={adminCardSpanFull()}
          title="Social"
          hint="Profile URLs. WhatsApp is under Store identity."
        >
          <div className={adminFieldsGrid(3)}>
            {(
              [
                ["socialInstagram", "Instagram"],
                ["socialFacebook", "Facebook"],
                ["socialYoutube", "YouTube"],
                ["socialLinkedin", "LinkedIn"],
                ["socialX", "X (Twitter)"],
              ] as const
            ).map(([name, label]) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field, fieldState }) => (
                  <div>
                    <TextField
                      {...field}
                      label={label}
                      fullWidth
                      size="small"
                      disabled={locked}
                      error={Boolean(fieldState.error)}
                      placeholder="https://"
                    />
                    <FieldError message={fieldState.error?.message} />
                  </div>
                )}
              />
            ))}
          </div>
        </Section>
      </div>
    </form>
  );
}
