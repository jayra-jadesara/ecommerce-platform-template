"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { useState, useTransition } from "react";
import {
  addressFormSchema,
  type AddressFormInput,
} from "@/features/addresses/validation";
import type { CustomerAddress } from "@/features/addresses/types";

interface AddressFormProps {
  initial?: CustomerAddress | null;
  submitLabel?: string;
  onSubmit: (values: AddressFormInput) => Promise<{ ok: boolean; error?: string }>;
  onCancel?: () => void;
}

export function AddressForm({
  initial,
  submitLabel = "Save address",
  onSubmit,
  onCancel,
}: AddressFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormInput>({
    resolver: zodResolver(addressFormSchema) as Resolver<AddressFormInput>,
    defaultValues: {
      fullName: initial?.fullName ?? "",
      phone: initial?.phone ?? "",
      addressLine1: initial?.addressLine1 ?? "",
      addressLine2: initial?.addressLine2 ?? "",
      city: initial?.city ?? "",
      state: initial?.state ?? "",
      postalCode: initial?.postalCode ?? "",
      country: initial?.country ?? "",
      isDefault: initial?.isDefault ?? false,
    },
  });

  const submit = handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) setError(result.error ?? "Could not save address.");
    });
  });

  const fieldClass =
    "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
          Full name
        </label>
        <input
          id="fullName"
          autoComplete="name"
          className={fieldClass}
          disabled={pending}
          aria-invalid={Boolean(errors.fullName)}
          {...register("fullName")}
        />
        {errors.fullName ? (
          <p className="mt-1 text-xs text-red-700">{errors.fullName.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium">
          Phone
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          className={fieldClass}
          disabled={pending}
          aria-invalid={Boolean(errors.phone)}
          {...register("phone")}
        />
        {errors.phone ? (
          <p className="mt-1 text-xs text-red-700">{errors.phone.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="addressLine1" className="mb-1 block text-sm font-medium">
          Address line 1
        </label>
        <input
          id="addressLine1"
          autoComplete="address-line1"
          className={fieldClass}
          disabled={pending}
          aria-invalid={Boolean(errors.addressLine1)}
          {...register("addressLine1")}
        />
        {errors.addressLine1 ? (
          <p className="mt-1 text-xs text-red-700">
            {errors.addressLine1.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="addressLine2" className="mb-1 block text-sm font-medium">
          Address line 2 (optional)
        </label>
        <input
          id="addressLine2"
          autoComplete="address-line2"
          className={fieldClass}
          disabled={pending}
          {...register("addressLine2")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="city" className="mb-1 block text-sm font-medium">
            City
          </label>
          <input
            id="city"
            autoComplete="address-level2"
            className={fieldClass}
            disabled={pending}
            aria-invalid={Boolean(errors.city)}
            {...register("city")}
          />
          {errors.city ? (
            <p className="mt-1 text-xs text-red-700">{errors.city.message}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="state" className="mb-1 block text-sm font-medium">
            State / region (optional)
          </label>
          <input
            id="state"
            autoComplete="address-level1"
            className={fieldClass}
            disabled={pending}
            {...register("state")}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="postalCode" className="mb-1 block text-sm font-medium">
            Postal code
          </label>
          <input
            id="postalCode"
            autoComplete="postal-code"
            className={fieldClass}
            disabled={pending}
            aria-invalid={Boolean(errors.postalCode)}
            {...register("postalCode")}
          />
          {errors.postalCode ? (
            <p className="mt-1 text-xs text-red-700">
              {errors.postalCode.message}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="country" className="mb-1 block text-sm font-medium">
            Country
          </label>
          <input
            id="country"
            autoComplete="country-name"
            className={fieldClass}
            disabled={pending}
            aria-invalid={Boolean(errors.country)}
            {...register("country")}
          />
          {errors.country ? (
            <p className="mt-1 text-xs text-red-700">{errors.country.message}</p>
          ) : null}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={pending} {...register("isDefault")} />
        Set as default address
      </label>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-button-background)] px-4 py-2 text-sm font-medium text-[var(--color-button-foreground)] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
