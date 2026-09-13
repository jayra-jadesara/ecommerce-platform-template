"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { registerAction } from "@/features/auth/actions";
import { IndianMobileField } from "@/features/auth/components/IndianMobileField";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { RECOVERY_QUESTIONS } from "@/features/auth/recovery-questions";
import {
  registerSchema,
  type RegisterInput,
} from "@/features/auth/validations";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      recoveryQuestionId: RECOVERY_QUESTIONS[0].id,
      recoveryAnswer: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const result = await registerAction(values);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
        router.push("/login");
      } catch {
        router.refresh();
        router.push("/login");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? (
        <Alert severity="error">
          {error}{" "}
          {error.toLowerCase().includes("already exists") ? (
            <Link
              href="/login"
              className="font-semibold underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          ) : null}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success">
          {success}{" "}
          <Link
            href="/login"
            className="font-semibold underline-offset-2 hover:underline"
          >
            Go to sign in
          </Link>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="First name"
          autoComplete="given-name"
          fullWidth
          disabled={pending}
          error={Boolean(errors.firstName)}
          helperText={errors.firstName?.message}
          {...register("firstName")}
        />
        <TextField
          label="Last name"
          autoComplete="family-name"
          fullWidth
          disabled={pending}
          error={Boolean(errors.lastName)}
          helperText={errors.lastName?.message}
          {...register("lastName")}
        />
      </div>

      <TextField
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="name@example.com"
        fullWidth
        disabled={pending}
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        {...register("email")}
      />

      <IndianMobileField
        name="phone"
        control={control}
        disabled={pending}
        error={Boolean(errors.phone)}
        helperText={errors.phone?.message ?? "Enter your 10-digit account number"}
      />

      <Controller
        name="recoveryQuestionId"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            label="Security question"
            fullWidth
            disabled={pending}
            error={Boolean(errors.recoveryQuestionId)}
            helperText={
              errors.recoveryQuestionId?.message ??
              "Used if you forget your password"
            }
          >
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
        helperText={errors.recoveryAnswer?.message}
        {...register("recoveryAnswer")}
      />

      <PasswordField
        label="Password"
        autoComplete="new-password"
        fullWidth
        disabled={pending}
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
        {...register("password")}
      />
      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        fullWidth
        disabled={pending}
        error={Boolean(errors.confirmPassword)}
        helperText={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button
        type="submit"
        variant="contained"
        disabled={pending || Boolean(success)}
        fullWidth
      >
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-[var(--color-muted)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
