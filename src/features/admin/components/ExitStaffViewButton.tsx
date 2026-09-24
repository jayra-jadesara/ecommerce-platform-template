"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { stopImpersonationAction } from "@/features/auth/stop-impersonation-actions";
import { getAdminPath } from "@/config/admin-route";

/** Exit impersonation from pages outside AdminShell (e.g. unauthorized). */
export function ExitStaffViewButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={
        className ??
        "inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-surface)] disabled:opacity-55"
      }
      onClick={() => {
        startTransition(async () => {
          await stopImpersonationAction();
          router.push(getAdminPath("/team", { staffViewToken: null }));
          router.refresh();
        });
      }}
    >
      {pending ? "Exiting…" : "Exit staff view"}
    </button>
  );
}
