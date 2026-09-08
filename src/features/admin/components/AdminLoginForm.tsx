"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { adminLoginAction } from "@/features/auth/actions";
import { loginSchema, type LoginInput } from "@/features/auth/validations";
import { safeAdminNextPath } from "@/features/auth/redirect";
import { getAdminPath } from "@/config/admin-route";

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dashboard = getAdminPath("/dashboard");
  const adminBase = getAdminPath();

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
    const next = safeAdminNextPath(
      searchParams.get("next"),
      adminBase,
      dashboard,
    );
    startTransition(async () => {
      const result = await adminLoginAction(values, next, dashboard);
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
        label="Admin email"
        type="email"
        autoComplete="email"
        fullWidth
        required
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
        required
        disabled={pending}
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" variant="contained" disabled={pending} fullWidth>
        {pending ? "Signing in…" : "Sign in to admin"}
      </Button>
    </form>
  );
}
