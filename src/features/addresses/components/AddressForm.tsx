"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { IndianMobileField } from "@/features/auth/components/IndianMobileField";
import { toNationalMobileDigits } from "@/features/auth/phone-normalize";
import {
  addressFormSchema,
  type AddressFormInput,
} from "@/features/addresses/validation";
import type { CustomerAddress } from "@/features/addresses/types";
import {
  getIndiaCitiesAction,
  getIndiaStatesAction,
  resolveIndiaStateIdAction,
} from "@/features/geo/actions";
import type { IndiaCity, IndiaState } from "@/features/geo/service";
import { sfBtn } from "@/components/ui/storefront-classes";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  DEFAULT_STORE_COUNTRY,
} from "@/lib/phone";

interface AddressFormProps {
  initial?: CustomerAddress | null;
  submitLabel?: string;
  phoneCountryCode?: string;
  storeCountry?: string;
  onSubmit: (values: AddressFormInput) => Promise<{ ok: boolean; error?: string }>;
  onCancel?: () => void;
}

export function AddressForm({
  initial,
  submitLabel = "Save address",
  phoneCountryCode = DEFAULT_PHONE_COUNTRY_CODE,
  storeCountry = DEFAULT_STORE_COUNTRY,
  onSubmit,
  onCancel,
}: AddressFormProps) {
  const lockedCountry = storeCountry.trim() || DEFAULT_STORE_COUNTRY;
  const isIndia = lockedCountry === "India";
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [states, setStates] = useState<IndiaState[]>([]);
  const [cities, setCities] = useState<IndiaCity[]>([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [geoLoading, setGeoLoading] = useState(isIndia);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AddressFormInput>({
    resolver: zodResolver(addressFormSchema) as Resolver<AddressFormInput>,
    mode: "onBlur",
    defaultValues: {
      fullName: initial?.fullName ?? "",
      phone: toNationalMobileDigits(initial?.phone ?? "", phoneCountryCode),
      addressLine1: initial?.addressLine1 ?? "",
      addressLine2: initial?.addressLine2 ?? "",
      city: initial?.city ?? "",
      state: initial?.state ?? "",
      postalCode: initial?.postalCode ?? "",
      country: lockedCountry,
      isDefault: initial?.isDefault ?? false,
    },
  });

  const watchedState = useWatch({ control, name: "state" });

  useEffect(() => {
    if (!isIndia) {
      setGeoLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setGeoLoading(true);
      const rows = await getIndiaStatesAction();
      if (cancelled) return;
      setStates(rows);

      const initialStateName = initial?.state?.trim() ?? "";
      if (initialStateName) {
        const match =
          rows.find(
            (s) => s.name.toLowerCase() === initialStateName.toLowerCase(),
          ) ?? null;
        const stateId =
          match?.id ?? (await resolveIndiaStateIdAction(initialStateName));
        if (stateId && !cancelled) {
          setSelectedStateId(stateId);
          const cityRows = await getIndiaCitiesAction(stateId);
          if (!cancelled) setCities(cityRows);
        }
      }
      if (!cancelled) setGeoLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initial?.state, isIndia]);

  useEffect(() => {
    if (!selectedStateId) return;
    let cancelled = false;
    void (async () => {
      const cityRows = await getIndiaCitiesAction(selectedStateId);
      if (!cancelled) setCities(cityRows);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedStateId]);

  const submit = handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await onSubmit({ ...values, country: lockedCountry });
      if (!result.ok) setError(result.error ?? "Could not save address.");
    });
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <TextField
        label="Full name"
        autoComplete="name"
        fullWidth
        disabled={pending}
        error={Boolean(errors.fullName)}
        helperText={errors.fullName?.message}
        {...register("fullName")}
      />

      <IndianMobileField
        name="phone"
        control={control}
        countryCode={phoneCountryCode}
        label="Phone"
        disabled={pending}
        error={Boolean(errors.phone)}
        helperText={
          errors.phone?.message ?? "Enter your 10-digit mobile number"
        }
      />

      <TextField
        label="Address line 1"
        autoComplete="address-line1"
        fullWidth
        disabled={pending}
        error={Boolean(errors.addressLine1)}
        helperText={errors.addressLine1?.message}
        {...register("addressLine1")}
      />

      <TextField
        label="Address line 2 (optional)"
        autoComplete="address-line2"
        fullWidth
        disabled={pending}
        {...register("addressLine2")}
      />

      <Controller
        name="state"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            label="State"
            fullWidth
            disabled={pending || geoLoading}
            error={Boolean(errors.state)}
            helperText={
              errors.state?.message ??
              (geoLoading ? "Loading states…" : "Select state first")
            }
            value={field.value ?? ""}
            onChange={(e) => {
              const name = e.target.value;
              field.onChange(name);
              const match = states.find((s) => s.name === name);
              setSelectedStateId(match?.id ?? "");
              setCities([]);
              setValue("city", "");
            }}
          >
            <MenuItem value="">
              <em>Select state</em>
            </MenuItem>
            {states.map((state) => (
              <MenuItem key={state.id} value={state.name}>
                {state.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      />

      <Controller
        name="city"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            label="City"
            fullWidth
            disabled={pending || geoLoading || !watchedState}
            error={Boolean(errors.city)}
            helperText={
              errors.city?.message ??
              (!watchedState
                ? "Select a state to see cities"
                : "Select city / district")
            }
            value={field.value ?? ""}
          >
            <MenuItem value="">
              <em>Select city</em>
            </MenuItem>
            {cities.map((city) => (
              <MenuItem key={city.id} value={city.name}>
                {city.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Postal code"
          autoComplete="postal-code"
          fullWidth
          disabled={pending}
          error={Boolean(errors.postalCode)}
          helperText={errors.postalCode?.message}
          {...register("postalCode")}
        />
        <TextField
          label="Country"
          value={lockedCountry}
          fullWidth
          disabled
          slotProps={{
            htmlInput: { readOnly: true, "aria-label": "Country" },
          }}
          helperText="From Store Information"
        />
      </div>

      <FormControlLabel
        control={
          <Controller
            name="isDefault"
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={Boolean(field.value)}
                onChange={(e) => field.onChange(e.target.checked)}
                disabled={pending}
              />
            )}
          />
        }
        label="Set as default address"
      />

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" disabled={pending} className={sfBtn("primary")}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className={sfBtn("outline")}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
