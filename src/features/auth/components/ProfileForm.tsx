"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { updateProfileAction } from "@/features/auth/actions";
import { IndianMobileField } from "@/features/auth/components/IndianMobileField";
import { RECOVERY_QUESTIONS } from "@/features/auth/recovery-questions";
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/features/auth/validations";

export function ProfileForm({
  defaultValues,
}: {
  defaultValues: ProfileUpdateInput;
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
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4" noValidate>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <TextField
        label="First name"
        fullWidth
        disabled={pending}
        error={Boolean(errors.firstName)}
        helperText={errors.firstName?.message}
        {...register("firstName")}
      />
      <TextField
        label="Last name"
        fullWidth
        disabled={pending}
        error={Boolean(errors.lastName)}
        helperText={errors.lastName?.message}
        {...register("lastName")}
      />

      <IndianMobileField
        name="phone"
        control={control}
        disabled={pending}
        error={Boolean(errors.phone)}
        helperText={errors.phone?.message ?? "Enter your 10-digit account number"}
      />

      <div className="border-t border-[var(--color-border)] pt-4">
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Security question for password recovery
          {defaultValues.recoveryQuestionId
            ? " (leave answer blank to keep the current one)"
            : " (required to use Forgot password)"}
        </p>
        <div className="flex flex-col gap-4">
          <Controller
            name="recoveryQuestionId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value ?? ""}
                select
                label="Security question"
                fullWidth
                disabled={pending}
                error={Boolean(errors.recoveryQuestionId)}
                helperText={errors.recoveryQuestionId?.message}
              >
                <MenuItem value="">
                  <em>Select a question</em>
                </MenuItem>
                {RECOVERY_QUESTIONS.map((q) => (
                  <MenuItem key={q.id} value={q.id}>
                    {q.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <TextField
            label="Security answer"
            autoComplete="off"
            fullWidth
            disabled={pending}
            error={Boolean(errors.recoveryAnswer)}
            helperText={
              errors.recoveryAnswer?.message ??
              "Enter a new answer only when changing the question"
            }
            {...register("recoveryAnswer")}
          />
        </div>
      </div>

      <Button type="submit" variant="contained" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
