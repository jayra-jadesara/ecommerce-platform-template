import Link from "next/link";
import { getAdminPath } from "@/config/admin-route";
import { ExitStaffViewButton } from "@/features/admin/components/ExitStaffViewButton";
import { getCurrentAdmin } from "@/features/auth/session";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { LogoutButton } from "@/features/auth/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminUnauthorizedPage() {
  const admin = await getCurrentAdmin();
  const impersonating = Boolean(admin?.impersonation);

  return (
    <AuthShell
      title="Access denied"
      subtitle={
        impersonating
          ? "This staff role cannot open that area. Use Exit staff view, or switch to your Super Admin tab — that tab is unaffected."
          : "Your account is signed in but does not have permission for this area."
      }
    >
      <div className="flex flex-col gap-4 text-sm text-[var(--color-muted)]">
        {admin ? (
          <p>
            {impersonating ? "Viewing as" : "Signed in as"} {admin.user.email}.
            Roles: {admin.roles.join(", ") || "none"}.
          </p>
        ) : (
          <p>No active admin role is assigned to this account.</p>
        )}
        <div className="flex flex-wrap gap-3">
          {impersonating ? (
            <ExitStaffViewButton />
          ) : (
            <Link
              href={getAdminPath("/dashboard")}
              className="text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              Back to dashboard
            </Link>
          )}
          {!impersonating ? (
            <LogoutButton redirectTo={getAdminPath("/login")} variant="outlined" />
          ) : null}
        </div>
      </div>
    </AuthShell>
  );
}
