"use client";

import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getAdminPath } from "@/config/admin-route";
import { stopImpersonationAction } from "@/features/auth/impersonation-actions";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

export function AdminImpersonationBanner({
  targetEmail,
  targetRoleLabel,
  actorEmail,
}: {
  targetEmail: string | null;
  targetRoleLabel: string;
  actorEmail: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="border-b border-[color-mix(in_srgb,var(--color-warning)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-card))] px-3 py-2 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[var(--color-foreground)]">
            Viewing as {targetRoleLabel}
            {targetEmail ? (
              <span className="font-medium text-[var(--color-muted)]">
                {" "}
                · {targetEmail}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
            Your Super Admin session stays signed in
            {actorEmail ? ` (${actorEmail})` : ""}. Exit to return.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          className={cn(adminBtn("outline"), "!min-h-8 !gap-1.5 !px-3 !text-xs")}
          onClick={() => {
            startTransition(async () => {
              await stopImpersonationAction();
              router.push(getAdminPath("/team"));
              router.refresh();
            });
          }}
        >
          <LoginOutlinedIcon sx={{ fontSize: 16 }} />
          {pending ? "Exiting…" : "Exit staff view"}
        </button>
      </div>
    </div>
  );
}
