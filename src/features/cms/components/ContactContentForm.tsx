"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { saveContactContentAction } from "@/features/admin/settings/actions";
import {
  contactContentSchema,
  type ContactContentFormValues,
} from "@/features/admin/settings/contact-content-schema";
import {
  citiesForState,
  INDIA_STATES,
} from "@/features/admin/settings/location-options";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { StorePhoneField } from "@/features/admin/ui/StorePhoneField";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { AdminSaveBar } from "@/features/admin/ui/AdminSaveBar";
import {
  adminCard,
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
import { MediaPicker } from "@/features/media";
import { resolveCmsImageUrl } from "@/features/cms/section-styles";
import { cn } from "@/lib/cn";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  DEFAULT_STORE_COUNTRY,
} from "@/lib/phone";

type Props = {
  initialValues: ContactContentFormValues;
  canUpdate: boolean;
  /** Dial code from Store Information. */
  phoneCountryCode?: string;
  /** Country from Store Information (locked on Contact). */
  storeCountry?: string;
};

function stateSelectOptions(current: string) {
  const base = INDIA_STATES.map((name) => ({ value: name, label: name }));
  if (
    current &&
    !(INDIA_STATES as readonly string[]).includes(current)
  ) {
    return [{ value: current, label: `${current} (saved)` }, ...base];
  }
  return base;
}

function citySelectOptions(state: string, current: string) {
  const list = citiesForState(state);
  const base = list.map((name) => ({ value: name, label: name }));
  if (current && !list.includes(current)) {
    return [{ value: current, label: `${current} (saved)` }, ...base];
  }
  return base;
}

export function ContactContentForm({
  initialValues,
  canUpdate,
  phoneCountryCode = DEFAULT_PHONE_COUNTRY_CODE,
  storeCountry = DEFAULT_STORE_COUNTRY,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError: setFieldError,
    setFocus,
    formState: { isDirty },
  } = useForm<ContactContentFormValues>({
    resolver: zodResolver(
      contactContentSchema,
    ) as Resolver<ContactContentFormValues>,
    defaultValues: {
      ...initialValues,
      country: initialValues.country?.trim() || storeCountry,
    },
  });

  const lockedCountry = storeCountry.trim() || DEFAULT_STORE_COUNTRY;
  const isIndia = lockedCountry === "India";

  const bannerPath = useWatch({ control, name: "contactBannerImagePath" });
  const bannerPreview = resolveCmsImageUrl(bannerPath);
  const bannerEnabled = useWatch({ control, name: "contactBannerEnabled" });
  const spotlightEnabled = useWatch({
    control,
    name: "contactSpotlightEnabled",
  });
  const spotlightPath = useWatch({
    control,
    name: "contactSpotlightImagePath",
  });
  const spotlightPreview = resolveCmsImageUrl(spotlightPath);
  const mapEnabled = useWatch({ control, name: "contactMapEnabled" });
  const stateValue = useWatch({ control, name: "state" }) ?? "";
  const cityValue = useWatch({ control, name: "city" }) ?? "";

  const stateOptions = useMemo(
    () => stateSelectOptions(stateValue),
    [stateValue],
  );
  const cityOptions = useMemo(
    () => citySelectOptions(stateValue, cityValue),
    [stateValue, cityValue],
  );

  function onSubmit(values: ContactContentFormValues) {
    setError(null);
    setSuccess(null);
    const payload: ContactContentFormValues = {
      ...values,
      country: lockedCountry,
    };
    startTransition(async () => {
      const result = await saveContactContentAction(payload);
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
      reset(payload);
      setSuccess(result.message ?? "Saved.");
      router.refresh();
    });
  }

  const locked = !canUpdate || pending;

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <AdminSaveBar
        isDirty={isDirty}
        canUpdate={canUpdate}
        pending={pending}
        error={error}
        success={success}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => {
          reset({
            ...initialValues,
            country: initialValues.country?.trim() || lockedCountry,
          });
          setError(null);
          setSuccess(null);
        }}
      />

      <div className={cn(adminCardsGrid(), "!gap-3")}>
        <section className={cn(adminCard(), adminCardSpanFull(), "space-y-3 p-4")}>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
              Page copy
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Centered heading and support line on /contact (after the banner).
            </p>
          </div>
          <div className={adminFieldsGrid(1)}>
            <Controller
              name="contactPageHeading"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Page heading"
                    fullWidth
                    size="small"
                    disabled={locked}
                    placeholder="Let’s connect"
                    error={Boolean(fieldState.error)}
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="contactPageSupport"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Support line"
                    fullWidth
                    size="small"
                    disabled={locked}
                    placeholder="Our representative will get back to you shortly"
                    error={Boolean(fieldState.error)}
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
          </div>
        </section>

        <section className={cn(adminCard(), adminCardSpanFull(), "space-y-3 p-4")}>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
              Hero banner
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Optional full-width photo under the header on /contact. Separate
              from Visit &amp; reach us.
            </p>
          </div>
          <Controller
            name="contactBannerEnabled"
            control={control}
            render={({ field }) => (
              <AdminToggle
                checked={Boolean(field.value)}
                disabled={locked}
                onChange={field.onChange}
                label="Show hero banner"
                description="Requires an image below"
                variant="row"
              />
            )}
          />
          {bannerEnabled ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              {bannerPreview ? (
                <div className="mb-3 max-w-xl overflow-hidden rounded-lg border border-[var(--color-border)]">
                  <div className="relative aspect-video w-full max-h-40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerPreview}
                      alt="Hero banner preview"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <p className="mb-3 text-sm text-[var(--color-muted)]">
                  No hero image selected
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={locked}
                  className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium"
                  onClick={() => setBannerOpen(true)}
                >
                  Choose image
                </button>
                {bannerPath ? (
                  <button
                    type="button"
                    disabled={locked}
                    className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)]"
                    onClick={() =>
                      setValue("contactBannerImagePath", null, {
                        shouldDirty: true,
                      })
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <section className={cn(adminCard(), adminCardSpanFull(), "space-y-3 p-4")}>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
              Visit &amp; reach us image
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Side photo next to company details. Off by default — enable to show
              on the store.
            </p>
          </div>
          <Controller
            name="contactSpotlightEnabled"
            control={control}
            render={({ field }) => (
              <AdminToggle
                checked={Boolean(field.value)}
                disabled={locked}
                onChange={field.onChange}
                label="Show image on Visit & reach us"
                description="Independent from the hero banner"
                variant="row"
              />
            )}
          />
          {spotlightEnabled ? (
            <>
              <div
                className="grid overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] sm:grid-cols-[minmax(0,1.15fr)_minmax(8rem,0.85fr)]"
                aria-hidden
              >
                <div className="space-y-2 bg-[var(--color-card)] p-3 text-[10px] text-[var(--color-muted)]">
                  <p className="font-semibold uppercase tracking-wide text-[var(--color-foreground)]">
                    Visit &amp; reach us
                  </p>
                  <p>Company · address · phone · email</p>
                </div>
                <div
                  className={cn(
                    "relative min-h-[7.5rem] overflow-hidden sm:min-h-full",
                    spotlightPreview
                      ? "bg-[#111]"
                      : "border-l border-dashed border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))]",
                  )}
                >
                  {spotlightPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={spotlightPreview}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain object-center"
                    />
                  ) : (
                    <p className="absolute inset-0 flex items-center justify-center px-2 text-center text-[10px] font-medium text-[var(--color-primary)]">
                      Side image
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                {spotlightPreview ? (
                  <div className="mb-3 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[#111]">
                    <div className="relative aspect-[16/10] w-full max-w-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={spotlightPreview}
                        alt="Visit & reach us image preview"
                        className="absolute inset-0 h-full w-full object-contain object-center"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 text-sm text-[var(--color-muted)]">
                    No image yet — choose a product or lifestyle photo
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={locked}
                    className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium"
                    onClick={() => setSpotlightOpen(true)}
                  >
                    Choose image
                  </button>
                  {spotlightPath ? (
                    <button
                      type="button"
                      disabled={locked}
                      className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)]"
                      onClick={() =>
                        setValue("contactSpotlightImagePath", null, {
                          shouldDirty: true,
                        })
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </section>

        <section className={cn(adminCard(), adminCardSpanFull(), "space-y-3 p-4")}>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
              Contact details
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Shown in the brand panel on /contact. Fill the address so the map
              can locate your store (or paste an embed URL in Map below).
            </p>
          </div>
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="contactEmail"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    label="Contact email"
                    type="email"
                    autoComplete="email"
                    fullWidth
                    size="small"
                    disabled={locked}
                    error={Boolean(fieldState.error)}
                    placeholder="name@example.com"
                    helperText={
                      fieldState.error
                        ? undefined
                        : "Must be a valid email address"
                    }
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
            <Controller
              name="contactPhone"
              control={control}
              render={({ fieldState }) => (
                <div>
                  <StorePhoneField
                    name="contactPhone"
                    control={control}
                    countryCode={phoneCountryCode}
                    label="Main phone"
                    disabled={locked}
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error?.message ??
                      `10 digits · code ${phoneCountryCode} (Store Information)`
                    }
                  />
                </div>
              )}
            />
            <Controller
              name="contactPhoneSecondary"
              control={control}
              render={({ fieldState }) => (
                <div>
                  <StorePhoneField
                    name="contactPhoneSecondary"
                    control={control}
                    countryCode={phoneCountryCode}
                    label="Second phone"
                    disabled={locked}
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error?.message ??
                      `Optional · 10 digits · code ${phoneCountryCode}`
                    }
                  />
                </div>
              )}
            />
            <Controller
              name="addressLine1"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Address line 1"
                  fullWidth
                  size="small"
                  disabled={locked}
                />
              )}
            />
            <Controller
              name="addressLine2"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Address line 2"
                  fullWidth
                  size="small"
                  disabled={locked}
                />
              )}
            />
            {isIndia ? (
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <AdminSelect
                    label="State"
                    disabled={locked}
                    value={field.value}
                    options={stateOptions}
                    allowEmpty
                    emptyLabel="Select state"
                    onChange={(next) => {
                      field.onChange(next);
                      const cities = citiesForState(next);
                      if (cities.length && !cities.includes(cityValue)) {
                        setValue(
                          "city",
                          cities.includes("Rajkot") ? "Rajkot" : cities[0]!,
                          { shouldDirty: true },
                        );
                      } else if (!next) {
                        setValue("city", "", { shouldDirty: true });
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
            {isIndia ? (
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <AdminSelect
                    label="City"
                    disabled={locked || !stateValue}
                    value={field.value}
                    options={cityOptions}
                    allowEmpty
                    emptyLabel={
                      stateValue ? "Select city" : "Select state first"
                    }
                    helperText={
                      stateValue ? undefined : "Pick a state to load cities"
                    }
                    onChange={field.onChange}
                  />
                )}
              />
            ) : (
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="City"
                    fullWidth
                    size="small"
                    disabled={locked}
                  />
                )}
              />
            )}
            <Controller
              name="postalCode"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Postal code"
                  fullWidth
                  size="small"
                  disabled={locked}
                />
              )}
            />
            <Controller
              name="country"
              control={control}
              render={() => (
                <TextField
                  value={lockedCountry}
                  label="Country"
                  fullWidth
                  size="small"
                  disabled
                  helperText="From Store Information"
                  slotProps={{
                    htmlInput: { readOnly: true, "aria-label": "Country" },
                  }}
                />
              )}
            />
          </div>
        </section>

        <section className={cn(adminCard(), adminCardSpanFull(), "space-y-3 p-4")}>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
              Map
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Appears on the storefront /contact page beside the message form.
            </p>
          </div>
          <Controller
            name="contactMapEnabled"
            control={control}
            render={({ field }) => (
              <AdminToggle
                checked={Boolean(field.value)}
                disabled={locked}
                onChange={field.onChange}
                label="Show map on store"
                description="Uses your address automatically, or a precise Google embed URL below"
                variant="row"
              />
            )}
          />
          {mapEnabled ? (
            <Controller
              name="contactMapEmbedUrl"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label="Google Maps embed URL (optional)"
                    fullWidth
                    size="small"
                    disabled={locked}
                    error={Boolean(fieldState.error)}
                    placeholder="https://www.google.com/maps/embed?pb=..."
                    helperText="Google Maps → search place → Share → Embed a map → copy the iframe src (or paste the whole iframe). Leave blank to use address search."
                  />
                  <FieldError message={fieldState.error?.message} />
                </div>
              )}
            />
          ) : null}
        </section>
      </div>

      <MediaPicker
        open={bannerOpen}
        folder="contact"
        onClose={() => setBannerOpen(false)}
        onSelect={(selection) => {
          setValue("contactBannerImagePath", selection.storagePath, {
            shouldDirty: true,
          });
          setBannerOpen(false);
        }}
      />
      <MediaPicker
        open={spotlightOpen}
        folder="contact"
        onClose={() => setSpotlightOpen(false)}
        onSelect={(selection) => {
          setValue("contactSpotlightImagePath", selection.storagePath, {
            shouldDirty: true,
          });
          setSpotlightOpen(false);
        }}
      />
    </form>
  );
}
