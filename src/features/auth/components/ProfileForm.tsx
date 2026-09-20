"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { sfBtn } from "@/components/ui/storefront-classes";
import { updateProfileAction } from "@/features/auth/actions";
import { sanitizeIndianMobileInput } from "@/features/auth/components/IndianMobileField";
import { RECOVERY_QUESTIONS } from "@/features/auth/recovery-questions";
import {
  profileUpdateSchema,
  REGISTER_COUNTRY_CODE,
  type ProfileUpdateInput,
} from "@/features/auth/validations";
import { cn } from "@/lib/cn";

const fieldClass =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";

const labelClass =
  "mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-[11px] text-[var(--color-error)]" role="alert">
      {message}
    </p>
  );
}

export function ProfileForm({
  defaultValues,
  email,
}: {
  defaultValues: ProfileUpdateInput;
  email?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      ...defaultValues,
      phone: defaultValues.phone ?? "",
      recoveryQuestionId: defaultValues.recoveryQuestionId ?? "",
      recoveryAnswer: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? "Saved.");
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      {error ? (
        <p
          className="rounded-lg border border-[color-mix(in_srgb,var(--color-error)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_8%,var(--color-card))] px-3 py-2 text-xs text-[var(--color-error)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="rounded-lg border border-[color-mix(in_srgb,var(--color-success)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_8%,var(--color-card))] px-3 py-2 text-xs text-[var(--color-success)]"
          role="status"
        >
          {success}
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)] px-3.5 py-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
            <PersonOutlineRoundedIcon className="!text-base" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              Account details
            </p>
            {email ? (
              <p className="truncate text-[11px] text-[var(--color-muted)]">
                {email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 p-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-first-name" className={labelClass}>
                First name
              </label>
              <input
                id="profile-first-name"
                className={fieldClass}
                disabled={pending}
                autoComplete="given-name"
                {...register("firstName")}
              />
              <FieldError message={errors.firstName?.message} />
            </div>
            <div>
              <label htmlFor="profile-last-name" className={labelClass}>
                Last name
              </label>
              <input
                id="profile-last-name"
                className={fieldClass}
                disabled={pending}
                autoComplete="family-name"
                {...register("lastName")}
              />
              <FieldError message={errors.lastName?.message} />
            </div>
          </div>

          <div>
            <p className={labelClass}>Mobile</p>
            <div className="grid grid-cols-[4.5rem_1fr] gap-2">
              <input
                className={cn(fieldClass, "text-center tabular-nums")}
                value={REGISTER_COUNTRY_CODE}
                disabled
                readOnly
                aria-label="Country code"
              />
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <input
                    id="profile-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="9876543210"
                    maxLength={10}
                    className={fieldClass}
                    disabled={pending}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(sanitizeIndianMobileInput(e.target.value))
                    }
                  />
                )}
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">
              {errors.phone?.message ?? "10-digit Indian mobile number"}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)] px-3.5 py-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
            <SecurityRoundedIcon className="!text-base" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              Password recovery
            </p>
            <p className="text-[11px] text-[var(--color-muted)]">
              {defaultValues.recoveryQuestionId
                ? "Leave answer blank to keep the current one"
                : "Required to use Forgot password"}
            </p>
          </div>
        </div>

        <div className="space-y-3 p-3.5">
          <div>
            <label htmlFor="profile-recovery-q" className={labelClass}>
              Security question
            </label>
            <Controller
              name="recoveryQuestionId"
              control={control}
              render={({ field }) => (
                <select
                  id="profile-recovery-q"
                  className={fieldClass}
                  disabled={pending}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                >
                  <option value="">Select a question</option>
                  {RECOVERY_QUESTIONS.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
              )}
            />
            <FieldError message={errors.recoveryQuestionId?.message} />
          </div>
          <div>
            <label htmlFor="profile-recovery-a" className={labelClass}>
              Security answer
            </label>
            <input
              id="profile-recovery-a"
              className={fieldClass}
              autoComplete="off"
              disabled={pending}
              {...register("recoveryAnswer")}
            />
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">
              {errors.recoveryAnswer?.message ??
                "Enter a new answer only when changing the question"}
            </p>
          </div>
        </div>
      </section>
      </div>

      <button
        type="submit"
        disabled={pending}
        className={cn(sfBtn("primary"), "!min-h-9 !px-4 !text-sm")}
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
