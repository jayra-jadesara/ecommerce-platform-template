"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import {
  createCouponAction,
  updateCouponAction,
} from "@/features/coupons/actions";
import {
  couponFormSchema,
  type CouponFormValues,
} from "@/features/coupons/schemas";

interface CouponFormProps {
  mode: "create" | "edit";
  couponId?: string;
  initialValues: CouponFormValues;
  currency: string;
  canSubmit: boolean;
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CouponForm({
  mode,
  couponId,
  initialValues,
  currency,
  canSubmit,
}: CouponFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listHref = getAdminPath("/settings/coupons");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema) as Resolver<CouponFormValues>,
    defaultValues: {
      ...initialValues,
      startsAt: initialValues.startsAt
        ? toDatetimeLocalValue(initialValues.startsAt)
        : null,
      expiresAt: initialValues.expiresAt
        ? toDatetimeLocalValue(initialValues.expiresAt)
        : null,
    },
  });

  const discountType = useWatch({ control, name: "discountType" });

  function onSubmit(values: CouponFormValues) {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const payload = {
        ...values,
        startsAt: values.startsAt || null,
        expiresAt: values.expiresAt || null,
      };
      const result =
        mode === "create"
          ? await createCouponAction(payload)
          : await updateCouponAction(couponId!, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(listHref);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto max-w-2xl space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"
    >
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <TextField
        label="Coupon Code"
        fullWidth
        required
        disabled={!canSubmit || pending}
        error={Boolean(errors.code)}
        helperText={errors.code?.message ?? "Stored uppercase (e.g. WELCOME10)"}
        slotProps={{ htmlInput: { style: { textTransform: "uppercase" } } }}
        {...register("code")}
      />

      <TextField
        label="Description"
        fullWidth
        multiline
        minRows={2}
        disabled={!canSubmit || pending}
        error={Boolean(errors.description)}
        helperText={errors.description?.message}
        {...register("description")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name="discountType"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Discount Type"
              fullWidth
              disabled={!canSubmit || pending}
            >
              <MenuItem value="percentage">Percentage</MenuItem>
              <MenuItem value="fixed">Fixed amount</MenuItem>
            </TextField>
          )}
        />
        <TextField
          label={
            discountType === "percentage"
              ? "Discount Value (%)"
              : `Discount Value (${currency})`
          }
          type="number"
          fullWidth
          required
          disabled={!canSubmit || pending}
          error={Boolean(errors.discountValue)}
          helperText={errors.discountValue?.message}
          slotProps={{ htmlInput: { step: "any", min: 0 } }}
          {...register("discountValue", { valueAsNumber: true })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={`Minimum Order (${currency})`}
          type="number"
          fullWidth
          disabled={!canSubmit || pending}
          error={Boolean(errors.minimumOrderAmount)}
          helperText={
            errors.minimumOrderAmount?.message ??
            "Optional. Compared to cart subtotal."
          }
          slotProps={{ htmlInput: { step: "any", min: 0 } }}
          {...register("minimumOrderAmount", {
            setValueAs: (v) =>
              v === "" || v == null || Number.isNaN(Number(v))
                ? null
                : Number(v),
          })}
        />
        <TextField
          label={`Maximum Discount (${currency})`}
          type="number"
          fullWidth
          disabled={!canSubmit || pending || discountType !== "percentage"}
          error={Boolean(errors.maximumDiscountAmount)}
          helperText={
            errors.maximumDiscountAmount?.message ??
            (discountType === "percentage"
              ? "Optional cap for percentage coupons."
              : "Only applies to percentage coupons.")
          }
          slotProps={{ htmlInput: { step: "any", min: 0 } }}
          {...register("maximumDiscountAmount", {
            setValueAs: (v) =>
              v === "" || v == null || Number.isNaN(Number(v))
                ? null
                : Number(v),
          })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Usage Limit"
          type="number"
          fullWidth
          disabled={!canSubmit || pending}
          error={Boolean(errors.usageLimit)}
          helperText={errors.usageLimit?.message ?? "Optional total redemptions."}
          slotProps={{ htmlInput: { step: 1, min: 1 } }}
          {...register("usageLimit", {
            setValueAs: (v) =>
              v === "" || v == null || Number.isNaN(Number(v))
                ? null
                : Math.trunc(Number(v)),
          })}
        />
        <TextField
          label="Per Customer Limit"
          type="number"
          fullWidth
          disabled={!canSubmit || pending}
          error={Boolean(errors.perUserLimit)}
          helperText={
            errors.perUserLimit?.message ?? "Optional uses per signed-in customer."
          }
          slotProps={{ htmlInput: { step: 1, min: 1 } }}
          {...register("perUserLimit", {
            setValueAs: (v) =>
              v === "" || v == null || Number.isNaN(Number(v))
                ? null
                : Math.trunc(Number(v)),
          })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Start Date"
          type="datetime-local"
          fullWidth
          disabled={!canSubmit || pending}
          slotProps={{ inputLabel: { shrink: true } }}
          error={Boolean(errors.startsAt)}
          helperText={errors.startsAt?.message}
          {...register("startsAt")}
        />
        <TextField
          label="Expiry Date"
          type="datetime-local"
          fullWidth
          disabled={!canSubmit || pending}
          slotProps={{ inputLabel: { shrink: true } }}
          error={Boolean(errors.expiresAt)}
          helperText={errors.expiresAt?.message}
          {...register("expiresAt")}
        />
      </div>

      <Controller
        name="isActive"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(_, checked) => field.onChange(checked)}
                disabled={!canSubmit || pending}
              />
            }
            label="Active"
          />
        )}
      />

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          disabled={!canSubmit || pending}
          className="rounded-md bg-[var(--color-button-background)] px-4 py-2 text-sm font-medium text-[var(--color-button-foreground)] disabled:opacity-50"
        >
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create coupon"
              : "Save changes"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push(listHref)}
          className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
