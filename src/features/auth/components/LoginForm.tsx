"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { loginAction } from "@/features/auth/actions";
import { loginSchema, type LoginInput } from "@/features/auth/validations";
import { safeInternalPath } from "@/features/auth/redirect";

export function LoginForm({
  registerHref = "/register",
  forgotHref = "/forgot-password",
  defaultNext = "/account",
}: {
  registerHref?: string;
  forgotHref?: string;
  defaultNext?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    const next = safeInternalPath(searchParams.get("next"), defaultNext);
    startTransition(async () => {
      const result = await loginAction(values, next);
      if (result && !result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        fullWidth
        disabled={pending}
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        fullWidth
        disabled={pending}
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
        {...register("password")}
      />

      <div className="flex justify-end">
        <Link
          href={forgotHref}
          className="text-sm text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" variant="contained" disabled={pending} fullWidth>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-[var(--color-muted)]">
        No account?{" "}
        <Link
          href={registerHref}
          className="text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
