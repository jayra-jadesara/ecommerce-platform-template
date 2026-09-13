"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { resetPasswordAction } from "@/features/auth/actions";
import { PasswordField } from "@/features/auth/components/PasswordField";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/validations";

export function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
    startTransition(async () => {
      const result = await resetPasswordAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      router.push("/login");
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <PasswordField
        label="New password"
        autoComplete="new-password"
        fullWidth
        disabled={pending}
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
        {...register("password")}
      />
      <PasswordField
        label="Confirm new password"
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
    </form>
  );
}
