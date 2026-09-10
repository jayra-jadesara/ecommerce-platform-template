"use client";

import { useTransition } from "react";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/cn";

/**
 * Native logout control — never uses MUI (avoids Emotion SSR/client class mismatch).
 */
export function LogoutControl({
  redirectTo = "/",
  label = "Log out",
  variant = "text",
}: {
  redirectTo?: string;
  label?: string;
  variant?: "text" | "outlined" | "contained";
}) {
  const [pending, startTransition] = useTransition();

  const variantClass =
    variant === "outlined"
      ? "w-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-surface)]"
      : variant === "contained"
        ? "bg-[var(--color-button-background)] text-[var(--color-button-foreground)]"
        : "bg-transparent text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] hover:text-[var(--color-foreground)]";

  return (
    <button
      type="button"
      data-admin-logout=""
      disabled={pending}
      className={cn(
        "inline-flex min-h-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50",
        variantClass,
      )}
      onClick={() => {
        startTransition(async () => {
          await logoutAction(redirectTo);
        });
      }}
    >
      {pending ? "Signing out…" : label}
    </button>
  );
}

/** @deprecated Prefer LogoutControl — kept for existing imports. */
export function LogoutButton(props: {
  redirectTo?: string;
  label?: string;
  variant?: "text" | "outlined" | "contained";
}) {
  return <LogoutControl {...props} />;
}
