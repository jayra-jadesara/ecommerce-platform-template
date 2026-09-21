"use client";

import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { clearHeaderAuthSnapshot } from "@/components/common/header-auth-store";
import { logoutAction } from "@/features/auth/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabasePublicEnvOptional } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";

/**
 * Native logout control — never uses MUI Button (avoids Emotion SSR/client class mismatch).
 */
export function LogoutControl({
  redirectTo = "/",
  label = "Log out",
  variant = "text",
  className,
  icon,
  /** Compact icon-only control (aria-label from label). */
  iconOnly = false,
}: {
  redirectTo?: string;
  label?: string;
  variant?: "text" | "outlined" | "contained";
  className?: string;
  icon?: ReactNode;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function runLogout() {
    startTransition(async () => {
      try {
        if (getSupabasePublicEnvOptional()) {
          const supabase = createSupabaseBrowserClient();
          await supabase.auth.signOut();
        }
      } catch {
        // Still clear UI + server session below.
      }
      clearHeaderAuthSnapshot();
      try {
        await logoutAction(redirectTo);
      } catch {
        router.refresh();
        router.push(redirectTo);
      }
    });
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        data-admin-logout=""
        disabled={pending}
        title={pending ? "Signing out…" : label}
        aria-label={pending ? "Signing out" : label}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-[var(--color-muted)] transition",
          "hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          "disabled:pointer-events-none disabled:opacity-40",
          className,
        )}
        onClick={runLogout}
      >
        {icon ?? <LogoutRoundedIcon sx={{ fontSize: 18 }} />}
      </button>
    );
  }

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
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:pointer-events-none disabled:text-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-muted))]",
        variantClass,
        className,
      )}
      onClick={runLogout}
    >
      {icon}
      {pending ? "Signing out…" : label}
    </button>
  );
}

/** @deprecated Prefer LogoutControl — kept for existing imports. */
export function LogoutButton(props: {
  redirectTo?: string;
  label?: string;
  variant?: "text" | "outlined" | "contained";
  className?: string;
  icon?: ReactNode;
  iconOnly?: boolean;
}) {
  return <LogoutControl {...props} />;
}
