import Link from "next/link";
import { GeneralSettingsForm } from "@/features/admin/settings/components/GeneralSettingsForm";
import { loadGeneralSettingsForm } from "@/features/admin/settings/load-forms";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

export const dynamic = "force-dynamic";

export default async function AdminGeneralSettingsPage() {
  const admin = await requirePermission("settings.view");
  const { values } = await loadGeneralSettingsForm();
  const canUpdate = hasPermission(admin, "settings.update");

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        <Link
          href={getAdminPath("/settings")}
          className="text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Settings
        </Link>
        <span aria-hidden> / </span>
        General
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        General store settings
      </h1>
      <GeneralSettingsForm initialValues={values} canUpdate={canUpdate} />
    </div>
  );
}
