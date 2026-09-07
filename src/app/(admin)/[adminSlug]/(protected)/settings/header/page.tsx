import Link from "next/link";
import { HeaderSettingsForm } from "@/features/admin/settings/components/HeaderSettingsForm";
import { loadHeaderSettingsForm } from "@/features/admin/settings/load-forms";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getStoreBranding } from "@/features/theme/service";
import { getAdminPath } from "@/config/admin-route";

export const dynamic = "force-dynamic";

export default async function AdminHeaderSettingsPage() {
  const admin = await requirePermission("settings.view");
  const [values, brand] = await Promise.all([
    loadHeaderSettingsForm(),
    getStoreBranding(),
  ]);
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
        Header
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Header settings
      </h1>
      <HeaderSettingsForm
        initialValues={values}
        brand={brand}
        canUpdate={canUpdate}
      />
    </div>
  );
}
