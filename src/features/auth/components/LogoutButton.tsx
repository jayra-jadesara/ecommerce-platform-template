"use client";

import Button from "@mui/material/Button";
import { useTransition } from "react";
import { logoutAction } from "@/features/auth/actions";

export function LogoutButton({
  redirectTo = "/",
  label = "Log out",
  variant = "text",
}: {
  redirectTo?: string;
  label?: string;
  variant?: "text" | "outlined" | "contained";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      color="inherit"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await logoutAction(redirectTo);
        });
      }}
    >
      {pending ? "Signing out…" : label}
    </Button>
  );
}
