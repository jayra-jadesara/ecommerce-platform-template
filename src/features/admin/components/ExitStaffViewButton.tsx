"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { stopStaffImpersonationAction } from "@/features/admin/team/actions";
import { getAdminPath } from "@/config/admin-route";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";

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
      className={cn(adminBtn("outline"), className)}
      onClick={() => {
        startTransition(async () => {
          await stopStaffImpersonationAction();
          router.push(getAdminPath("/team"));
          router.refresh();
        });
      }}
    >
      {pending ? "Exiting…" : "Exit staff view"}
    </button>
  );
}
