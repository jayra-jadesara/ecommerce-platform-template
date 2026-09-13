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
import {
  resetPasswordWithRecoveryAction,
  verifyPasswordRecoveryAction,
} from "@/features/auth/actions";
import { IndianMobileField } from "@/features/auth/components/IndianMobileField";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { RECOVERY_QUESTIONS } from "@/features/auth/recovery-questions";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/features/auth/validations";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"verify" | "reset">("verify");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const verifyForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      phone: "",
      recoveryQuestionId: RECOVERY_QUESTIONS[0].id,
      recoveryAnswer: "",
    },
  });

  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onVerify = verifyForm.handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await verifyPasswordRecoveryAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep("reset");
      setSuccess(result.message ?? "Verified. Choose a new password.");
    });
  });

  const onReset = resetForm.handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await resetPasswordWithRecoveryAction(values);
      if (!result.ok) {
        setError(result.error);
        if (result.error.toLowerCase().includes("expired")) {
          setStep("verify");
        }
        return;
      }
      router.refresh();
      router.push("/login");
    });
  });

  if (step === "reset") {
    return (
      <form onSubmit={onReset} className="flex flex-col gap-4" noValidate>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        <PasswordField
          label="New password"
          autoComplete="new-password"
          fullWidth
          disabled={pending}
          error={Boolean(resetForm.formState.errors.password)}
          helperText={resetForm.formState.errors.password?.message}
          {...resetForm.register("password")}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          fullWidth
          disabled={pending}
          error={Boolean(resetForm.formState.errors.confirmPassword)}
          helperText={resetForm.formState.errors.confirmPassword?.message}
          {...resetForm.register("confirmPassword")}
        />

        <Button type="submit" variant="contained" disabled={pending} fullWidth>
          {pending ? "Updating…" : "Update password"}
        </Button>

        <p className="text-center text-sm text-[var(--color-muted)]">
          <button
            type="button"
            className="text-[var(--color-primary)] underline-offset-2 hover:underline"
            onClick={() => {
              setStep("verify");
              setError(null);
              setSuccess(null);
            }}
          >
            Back to verification
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={onVerify} className="flex flex-col gap-4" noValidate>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <TextField
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="name@example.com"
        fullWidth
        disabled={pending}
        error={Boolean(verifyForm.formState.errors.email)}
        helperText={verifyForm.formState.errors.email?.message}
        {...verifyForm.register("email")}
      />

      <IndianMobileField
        name="phone"
        control={verifyForm.control}
        disabled={pending}
        error={Boolean(verifyForm.formState.errors.phone)}
        helperText={
          verifyForm.formState.errors.phone?.message ??
          "Enter your 10-digit account number"
        }
      />

      <Controller
        name="recoveryQuestionId"
        control={verifyForm.control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            label="Security question"
            fullWidth
            disabled={pending}
            error={Boolean(verifyForm.formState.errors.recoveryQuestionId)}
            helperText={verifyForm.formState.errors.recoveryQuestionId?.message}
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
        error={Boolean(verifyForm.formState.errors.recoveryAnswer)}
        helperText={verifyForm.formState.errors.recoveryAnswer?.message}
        {...verifyForm.register("recoveryAnswer")}
      />

      <Button type="submit" variant="contained" disabled={pending} fullWidth>
        {pending ? "Verifying…" : "Continue"}
      </Button>

      <p className="text-center text-sm text-[var(--color-muted)]">
        <Link
          href="/login"
          className="text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
