"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
import { formatMoney } from "@/features/catalog/money";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminFieldGroup,
  adminFieldsGrid,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";

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
      discountType:
        initialValues.discountType === "percentage" ||
        initialValues.discountType === "fixed"
          ? initialValues.discountType
          : "percentage",
      startsAt: initialValues.startsAt
        ? toDatetimeLocalValue(initialValues.startsAt)
        : null,
      expiresAt: initialValues.expiresAt
        ? toDatetimeLocalValue(initialValues.expiresAt)
        : null,
    },
  });

  const watched = useWatch({ control });
  const discountType =
    watched.discountType === "percentage" || watched.discountType === "fixed"
      ? watched.discountType
      : "percentage";
  const discountValue = Number(watched.discountValue);
  const codePreview = (watched.code || "").trim().toUpperCase() || "YOURCODE";
  const isActive = Boolean(watched.isActive);

  const example = useMemo(() => {
    const sampleSubtotal = 1000;
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return { sampleSubtotal, savings: 0, pay: sampleSubtotal };
    }
    let savings =
      discountType === "percentage"
        ? (sampleSubtotal * discountValue) / 100
        : discountValue;
    const maxCap = Number(watched.maximumDiscountAmount);
    if (
      discountType === "percentage" &&
      Number.isFinite(maxCap) &&
      maxCap > 0
    ) {
      savings = Math.min(savings, maxCap);
    }
    savings = Math.min(savings, sampleSubtotal);
    return {
      sampleSubtotal,
      savings,
      pay: Math.max(0, sampleSubtotal - savings),
    };
  }, [discountType, discountValue, watched.maximumDiscountAmount]);

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
      className="w-full"
      style={adminStackStyle}
      noValidate
    >
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <p className="text-sm text-[var(--color-muted)]">
        Customers type this code at checkout to get a discount. Keep the code
        short and easy to remember.
      </p>

      <section
        className={`${adminCard()} ${adminCardPadding()}`}
        style={adminStackStyle}
      >
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">1. Coupon code</p>
          <p className="admin-field-group__hint">
            This is what shoppers enter — for example WELCOME10.
          </p>
          <TextField
            label="Code shoppers type"
            fullWidth
            required
            disabled={!canSubmit || pending}
            error={Boolean(errors.code)}
            helperText={
              errors.code?.message ??
              "Letters and numbers only. Saved in CAPITALS."
            }
            placeholder="WELCOME10"
            slotProps={{ htmlInput: { style: { textTransform: "uppercase" } } }}
            {...register("code")}
          />
          <TextField
            label="Note for your team (optional)"
            fullWidth
            multiline
            minRows={2}
            disabled={!canSubmit || pending}
            error={Boolean(errors.description)}
            helperText={
              errors.description?.message ??
              "Not shown to customers — just for your records."
            }
            placeholder="Example: Launch offer for first-time buyers"
            {...register("description")}
          />
        </div>
      </section>

      <section
        className={`${adminCard()} ${adminCardPadding()}`}
        style={adminStackStyle}
      >
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">2. How much off?</p>
          <p className="admin-field-group__hint">
            Choose a percent off the order, or a fixed amount in {currency}.
          </p>
          <div className={adminFieldsGrid(2)}>
            <Controller
              name="discountType"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Discount type"
                  fullWidth
                  disabled={!canSubmit || pending}
                  value={discountType}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                  name={field.name}
                  inputRef={field.ref}
                  helperText="Most stores use a percentage"
                >
                  <MenuItem value="percentage">Percentage off (%)</MenuItem>
                  <MenuItem value="fixed">
                    Fixed amount off ({currency})
                  </MenuItem>
                </TextField>
              )}
            />
            <TextField
              label={
                discountType === "percentage"
                  ? "Percent off"
                  : `Amount off (${currency})`
              }
              type="number"
              fullWidth
              required
              disabled={!canSubmit || pending}
              error={Boolean(errors.discountValue)}
              helperText={
                errors.discountValue?.message ||
                (discountType === "percentage"
                  ? "Example: 10 means 10% off"
                  : `Example: 100 means ${formatMoney(100, currency)} off`)
              }
              slotProps={{ htmlInput: { step: "any", min: 0 } }}
              {...register("discountValue", { valueAsNumber: true })}
            />
          </div>

          <div className={adminFieldsGrid(2)}>
            <TextField
              label={`Minimum order (${currency})`}
              type="number"
              fullWidth
              disabled={!canSubmit || pending}
              error={Boolean(errors.minimumOrderAmount)}
              helperText={
                errors.minimumOrderAmount?.message ??
                "Leave blank for no minimum. Checked against cart total."
              }
              placeholder="Optional"
              slotProps={{ htmlInput: { step: "any", min: 0 } }}
              {...register("minimumOrderAmount", {
                setValueAs: (v) =>
                  v === "" || v == null || Number.isNaN(Number(v))
                    ? null
                    : Number(v),
              })}
            />
            {discountType === "percentage" ? (
              <TextField
                label={`Max discount (${currency})`}
                type="number"
                fullWidth
                disabled={!canSubmit || pending}
                error={Boolean(errors.maximumDiscountAmount)}
                helperText={
                  errors.maximumDiscountAmount?.message ??
                  "Optional cap so a big cart does not get unlimited off."
                }
                placeholder="Optional"
                slotProps={{ htmlInput: { step: "any", min: 0 } }}
                {...register("maximumDiscountAmount", {
                  setValueAs: (v) =>
                    v === "" || v == null || Number.isNaN(Number(v))
                      ? null
                      : Number(v),
                })}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)] self-center">
                Max discount only applies to percentage coupons.
              </p>
            )}
          </div>
        </div>
      </section>

      <section
        className={`${adminCard()} ${adminCardPadding()}`}
        style={adminStackStyle}
      >
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">3. Limits & schedule</p>
          <p className="admin-field-group__hint">
            Control how many times the code can be used, and when it works.
          </p>
          <div className={adminFieldsGrid(2)}>
            <TextField
              label="Total uses allowed"
              type="number"
              fullWidth
              disabled={!canSubmit || pending}
              error={Boolean(errors.usageLimit)}
              helperText={
                errors.usageLimit?.message ??
                "Leave blank for unlimited uses across all customers."
              }
              placeholder="Optional"
              slotProps={{ htmlInput: { step: 1, min: 1 } }}
              {...register("usageLimit", {
                setValueAs: (v) =>
                  v === "" || v == null || Number.isNaN(Number(v))
                    ? null
                    : Math.trunc(Number(v)),
              })}
            />
            <TextField
              label="Uses per customer"
              type="number"
              fullWidth
              disabled={!canSubmit || pending}
              error={Boolean(errors.perUserLimit)}
              helperText={
                errors.perUserLimit?.message ??
                "Leave blank for no per-person limit (signed-in customers)."
              }
              placeholder="Optional"
              slotProps={{ htmlInput: { step: 1, min: 1 } }}
              {...register("perUserLimit", {
                setValueAs: (v) =>
                  v === "" || v == null || Number.isNaN(Number(v))
                    ? null
                    : Math.trunc(Number(v)),
              })}
            />
            <TextField
              label="Starts"
              type="datetime-local"
              fullWidth
              disabled={!canSubmit || pending}
              slotProps={{ inputLabel: { shrink: true } }}
              error={Boolean(errors.startsAt)}
              helperText={
                errors.startsAt?.message ??
                "Leave blank to start as soon as you save."
              }
              {...register("startsAt")}
            />
            <TextField
              label="Ends"
              type="datetime-local"
              fullWidth
              disabled={!canSubmit || pending}
              slotProps={{ inputLabel: { shrink: true } }}
              error={Boolean(errors.expiresAt)}
              helperText={
                errors.expiresAt?.message ??
                "Leave blank if the code should not expire."
              }
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
                    checked={Boolean(field.value)}
                    onChange={(_, checked) => field.onChange(checked)}
                    disabled={!canSubmit || pending}
                  />
                }
                label={
                  isActive
                    ? "Active — customers can use this code"
                    : "Inactive — code is hidden from checkout"
                }
              />
            )}
          />
        </div>
      </section>

      <section className={`${adminCard()} ${adminCardPadding()}`}>
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          Example at checkout
        </h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          If someone buys {formatMoney(example.sampleSubtotal, currency)} and
          enters <span className="font-medium">{codePreview}</span>:
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <dt>Discount</dt>
            <dd className="font-medium">
              −{formatMoney(example.savings, currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-base font-semibold">
            <dt>They pay</dt>
            <dd>{formatMoney(example.pay, currency)}</dd>
          </div>
        </dl>
        {!isActive ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            This coupon is inactive, so it will not work until you turn it on.
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!canSubmit || pending}
          className={adminBtn("primary")}
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
          className={adminBtn("outline")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
