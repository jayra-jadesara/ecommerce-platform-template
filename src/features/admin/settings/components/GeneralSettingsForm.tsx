"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { saveGeneralSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  DEFAULT_GENERAL_SETTINGS,
  generalSettingsSchema,
  type GeneralSettingsFormValues,
} from "@/features/admin/settings/schemas";
import { AdminSection } from "@/features/admin/ui/AdminCard";
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
  adminCardsGrid,
  adminCardSpanFull,
  adminFieldsGrid,
} from "@/features/admin/ui/admin-classes";
import { FieldError } from "@/features/admin/ui/FieldError";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import { whatsappDisplayValue } from "@/features/admin/settings/validation";

interface GeneralSettingsFormProps {
  initialValues: GeneralSettingsFormValues;
  canUpdate: boolean;
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
    ...(!hasValue && value
      ? [{ value, label: `${value} (saved)` }]
      : []),
    ...normalized,
    ...(allowCustom
      ? [{ value: "__custom__", label: customLabel }]
      : []),
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
      "India",
    );
    const countryDefaults = defaultsForCountry(country);
    return {
      ...DEFAULT_GENERAL_SETTINGS,
      ...initialValues,
      country: initialValues.country?.trim() || "India",
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
      ),
    } satisfies GeneralSettingsFormValues;
  }, [initialValues]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError: setFieldError,
    setFocus,
    formState: { isDirty },
  } = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: defaults,
  });

  const country = useWatch({ control, name: "country" }) ?? "India";
  const state = useWatch({ control, name: "state" }) ?? "";
  const city = useWatch({ control, name: "city" }) ?? "";
  const isIndia = country === "India";
  const cityOptions = isIndia ? citiesForState(state) : [];
  const cityInList = cityOptions.includes(city);
  const showCityText =
    customCity || (Boolean(city) && !cityInList) || cityOptions.length === 0;

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
      className="space-y-4"
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
        }}
        onResetDefaults={() => {
          reset({
            ...DEFAULT_GENERAL_SETTINGS,
            country: "India",
            timezone: "Asia/Kolkata",
            defaultLocale: "en-IN",
            currency: "INR",
          });
          setSuccess(null);
          setCustomCity(false);
        }}
      />

      <div className={adminCardsGrid()}>
        <AdminSection
          title="Store identity"
          description="Name and how customers reach you."
          icon={<StorefrontOutlinedIcon sx={{ fontSize: 20 }} />}
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
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error ? undefined : "Example: Sonet Spices"
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
                  label="Legal business name"
                  fullWidth
                  size="small"
                  disabled={!canUpdate || pending}
                  helperText="Optional — invoices and paperwork"
                />
              )}
            />
            <Controller
              name="contactEmail"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Contact email"
                    fullWidth
                    size="small"
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="contactPhone"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Main phone"
                    fullWidth
                    size="small"
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="contactPhoneSecondary"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Second phone"
                    fullWidth
                    size="small"
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="socialWhatsapp"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="WhatsApp number"
                    fullWidth
                    size="small"
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                    placeholder="+91 98765 43210"
                    helperText={
                      fieldState.error
                        ? undefined
                        : "Include country code. Saved as a chat link for the storefront."
                    }
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
          </div>
        </AdminSection>

        <AdminSection
          title="Locale"
          description="Currency, language, and timezone for the storefront."
          icon={<LanguageOutlinedIcon sx={{ fontSize: 20 }} />}
        >
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="currency"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <SelectField
                    label="Currency"
                    required
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error
                        ? undefined
                        : "Used on product prices and checkout"
                    }
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
                  label="Language / region"
                  required
                  disabled={!canUpdate || pending}
                  helperText="How dates and language are shown"
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
                <SelectField
                  label="Timezone"
                  required
                  disabled={!canUpdate || pending}
                  helperText="Order times and schedules"
                  value={field.value}
                  options={[...STORE_TIMEZONES]}
                  onChange={field.onChange}
                  allowCustom
                />
              )}
            />
          </div>
        </AdminSection>

        <AdminSection
          className={adminCardSpanFull()}
          title="Address & location"
          description="Business address shown to customers where configured."
          icon={<PlaceOutlinedIcon sx={{ fontSize: 20 }} />}
        >
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <SelectField
                  label="Country"
                  disabled={!canUpdate || pending}
                  value={field.value || "India"}
                  options={[...STORE_COUNTRIES]}
                  onChange={(next) => {
                    field.onChange(next);
                    const d = defaultsForCountry(next);
                    setValue("timezone", d.timezone, { shouldDirty: true });
                    setValue("defaultLocale", d.defaultLocale, {
                      shouldDirty: true,
                    });
                    setValue("currency", d.currency, { shouldDirty: true });
                    if (next !== "India") {
                      setCustomCity(true);
                    }
                  }}
                  helperText="Changing country updates currency, language, and timezone"
                />
              )}
            />
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
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="addressLine1"
              control={control}
              render={({ field, fieldState }) => (
                <div className="md:col-span-2">
                  <TextField
                    {...field}
                    label="Street address"
                    fullWidth
                    size="small"
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="addressLine2"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Landmark / area"
                  fullWidth
                  size="small"
                  disabled={!canUpdate || pending}
                />
              )}
            />
            {isIndia ? (
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="State"
                    disabled={!canUpdate || pending}
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
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="State / region"
                    fullWidth
                    size="small"
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
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
                    disabled={!canUpdate || pending}
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
                  <TextField
                    {...field}
                    label="City"
                    fullWidth
                    size="small"
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                    helperText={
                      isIndia
                        ? "Type your city, or pick a state first for suggestions"
                        : undefined
                    }
                  />
                )}
              />
            )}
          </div>
        </AdminSection>

        <AdminSection
          title="Business & accounts"
          description="Tax IDs and how customers sign in or check out."
          icon={<BadgeOutlinedIcon sx={{ fontSize: 20 }} />}
        >
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="businessRegistrationNumber"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Business registration number"
                  fullWidth
                  size="small"
                  disabled={!canUpdate || pending}
                  helperText="Example: company or FSSAI number"
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
                  disabled={!canUpdate || pending}
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
                  disabled={!canUpdate || pending}
                  label="Allow customers to create accounts"
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
                  disabled={!canUpdate || pending}
                  label="Allow checkout without an account"
                  variant="row"
                />
              )}
            />
          </div>
        </AdminSection>

        <AdminSection
          className={adminCardSpanFull()}
          title="Social profile links"
          description="Full profile URLs only. WhatsApp number is under Store identity."
          icon={<ShareOutlinedIcon sx={{ fontSize: 20 }} />}
        >
          <div className={adminFieldsGrid(2)}>
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
                      disabled={!canUpdate || pending}
                      error={Boolean(fieldState.error)}
                      placeholder="https://"
                    />
                    <FieldError message={fieldState.error?.message} />
                  </div>
                )}
              />
            ))}
          </div>
        </AdminSection>
      </div>
    </form>
  );
}
