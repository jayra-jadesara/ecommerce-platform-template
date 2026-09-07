import Link from "next/link";
import { FooterSettingsForm } from "@/features/admin/settings/components/FooterSettingsForm";
import { loadFooterSettingsForm } from "@/features/admin/settings/load-forms";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getStoreBranding } from "@/features/theme/service";
import { getAdminPath } from "@/config/admin-route";

export const dynamic = "force-dynamic";

export default async function AdminFooterSettingsPage() {
  const admin = await requirePermission("settings.view");
  const [values, brand] = await Promise.all([
    loadFooterSettingsForm(),
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
        Footer
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Footer settings
      </h1>
      <FooterSettingsForm
        initialValues={values}
        brand={brand}
        canUpdate={canUpdate}
      />
    </div>
  );
}
