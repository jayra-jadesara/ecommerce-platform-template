"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { updateProfileAction } from "@/features/auth/actions";
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
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues,
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
      <TextField
        label="Phone"
        fullWidth
        disabled={pending}
        error={Boolean(errors.phone)}
        helperText={errors.phone?.message}
        {...register("phone")}
      />

      <Button type="submit" variant="contained" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
