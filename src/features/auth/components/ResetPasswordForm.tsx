"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { resetPasswordAction } from "@/features/auth/actions";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/validations";

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await resetPasswordAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? "Password updated.");
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        fullWidth
        disabled={pending}
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
        {...register("password")}
      />
      <TextField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        fullWidth
        disabled={pending}
        error={Boolean(errors.confirmPassword)}
        helperText={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button type="submit" variant="contained" disabled={pending} fullWidth>
        {pending ? "Updating…" : "Update password"}
      </Button>

      {success ? (
        <p className="text-center text-sm">
          <Link
            href="/account"
            className="text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            Go to account
          </Link>
        </p>
      ) : null}
    </form>
  );
}
