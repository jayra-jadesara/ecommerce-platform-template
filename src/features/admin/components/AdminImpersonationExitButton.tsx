"use client";

import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getAdminPath } from "@/config/admin-route";
import { stopImpersonationAction } from "@/features/auth/impersonation-actions";
import { cn } from "@/lib/cn";

/** Compact exit control for sidebar / menus while impersonating. */
export function AdminImpersonationExitButton({
  className,
  iconOnly = false,
  label = "Exit staff view",
}: {
  className?: string;
  iconOnly?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function exit() {
    startTransition(async () => {
      await stopImpersonationAction();
      router.push(getAdminPath("/team"));
      router.refresh();
    });
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        disabled={pending}
        title={pending ? "Exiting…" : label}
        aria-label={pending ? "Exiting staff view" : label}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-[var(--color-muted)] transition",
          "hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          "disabled:pointer-events-none disabled:opacity-40",
          className,
        )}
        onClick={exit}
      >
        <LoginOutlinedIcon sx={{ fontSize: 18 }} />
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-[var(--color-foreground)] transition hover:bg-[color-mix(in_srgb,var(--color-warning)_10%,var(--color-surface))]",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      onClick={exit}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-warning)_14%,var(--color-surface))] text-[var(--color-warning)]">
        <LoginOutlinedIcon sx={{ fontSize: 18 }} />
      </span>
      {pending ? "Exiting…" : label}
    </button>
  );
}
