"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
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
  adminCard,
  adminCardPadding,
  adminCardsGrid,
  adminCardSpanFull,
  adminFieldGroup,
  adminFieldsGrid,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";

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

  return (
    <TextField
      select
      label={label}
      fullWidth
      required={required}
      disabled={disabled}
      error={error}
      helperText={helperText}
      value={selectValue}
      onChange={(event) => {
        const next = event.target.value;
        if (next === "__custom__") {
          onChange("");
          return;
        }
        onChange(next);
      }}
    >
      {!hasValue && value ? (
        <MenuItem value={value}>{value} (saved)</MenuItem>
      ) : null}
      {normalized.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
      {allowCustom ? (
        <MenuItem value="__custom__">{customLabel}</MenuItem>
      ) : null}
    </TextField>
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
    } satisfies GeneralSettingsFormValues;
  }, [initialValues]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
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
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      reset(values);
      router.refresh();
    });
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="w-full"
      style={adminStackStyle}
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
        <section className={`${adminCard()} ${adminCardPadding()}`} style={adminStackStyle}>
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">1. Store name</p>
          <p className="admin-field-group__hint">
            What shoppers see as your brand name.
          </p>
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="displayName"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Store name shoppers see"
                  fullWidth
                  required
                  disabled={!canUpdate || pending}
                  error={Boolean(fieldState.error)}
                  helperText={
                    fieldState.error?.message ?? "Example: Sonet Spices"
                  }
                />
              )}
            />
            <Controller
              name="legalName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Legal / registered business name"
                  fullWidth
                  disabled={!canUpdate || pending}
                  helperText="Optional — for invoices and paperwork"
                />
              )}
            />
          </div>
        </div>
        </section>

        <section className={`${adminCard()} ${adminCardPadding()}`} style={adminStackStyle}>
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">2. Money &amp; language</p>
          <p className="admin-field-group__hint">
            Prices, language, and clock — usually match your country.
          </p>
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="currency"
              control={control}
              render={({ field, fieldState }) => (
                <SelectField
                  label="Currency"
                  required
                  disabled={!canUpdate || pending}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message ?? "Used on product prices and checkout"}
                  value={field.value}
                  options={[...STORE_CURRENCIES]}
                  onChange={field.onChange}
                />
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
                  helperText="How dates and language are shown in the store"
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
                  helperText="Used for order times and schedules"
                  value={field.value}
                  options={[...STORE_TIMEZONES]}
                  onChange={field.onChange}
                  allowCustom
                />
              )}
            />
          </div>
        </div>
        </section>

        <section className={`${adminCard()} ${adminCardPadding()}`} style={adminStackStyle}>
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">3. Contact &amp; address</p>
          <p className="admin-field-group__hint">
            How customers reach you, and where your business is based.
          </p>
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="contactEmail"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Email customers can write to"
                  fullWidth
                  disabled={!canUpdate || pending}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="contactPhone"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Main phone number"
                  fullWidth
                  disabled={!canUpdate || pending}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="contactPhoneSecondary"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Second phone (optional)"
                  fullWidth
                  disabled={!canUpdate || pending}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
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
              name="addressLine1"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Street address"
                  fullWidth
                  disabled={!canUpdate || pending}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  className="md:col-span-2"
                />
              )}
            />
            <Controller
              name="addressLine2"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Landmark / area (optional)"
                  fullWidth
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
                        setValue("city", cities.includes("Rajkot") ? "Rajkot" : cities[0]!, {
                          shouldDirty: true,
                        });
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
            <Controller
              name="postalCode"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="PIN / postal code"
                  fullWidth
                  disabled={!canUpdate || pending}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </div>
        </div>
        </section>

        <section className={`${adminCard()} ${adminCardPadding()}`} style={adminStackStyle}>
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">4. Business IDs (optional)</p>
          <p className="admin-field-group__hint">
            For invoices and tax paperwork — skip if you do not have them yet.
          </p>
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="businessRegistrationNumber"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Business registration number"
                  fullWidth
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
                  disabled={!canUpdate || pending}
                />
              )}
            />
            <Controller
              name="registrationEnabled"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                      disabled={!canUpdate || pending}
                    />
                  }
                  label="Allow customers to create accounts"
                />
              )}
            />
            <Controller
              name="checkoutGuestAllowed"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                      disabled={!canUpdate || pending}
                    />
                  }
                  label="Allow checkout without an account"
                />
              )}
            />
          </div>
        </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()} ${adminCardSpanFull()}`}
          style={adminStackStyle}
        >
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">5. Social links (optional)</p>
          <p className="admin-field-group__hint">
            Paste full profile links. Leave blank if you do not use a network.
          </p>
          <div className={adminFieldsGrid(2)}>
            {(
              [
                ["socialInstagram", "Instagram"],
                ["socialFacebook", "Facebook"],
                ["socialYoutube", "YouTube"],
                ["socialLinkedin", "LinkedIn"],
                ["socialX", "X (Twitter)"],
                ["socialWhatsapp", "WhatsApp"],
              ] as const
            ).map(([name, label]) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label={label}
                    fullWidth
                    disabled={!canUpdate || pending}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    placeholder="https://"
                  />
                )}
              />
            ))}
          </div>
        </div>
        </section>
      </div>
    </form>
  );
}
