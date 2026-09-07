import Link from "next/link";
import { BrandingSettingsForm } from "@/features/admin/settings/components/BrandingSettingsForm";
import { loadBrandingSettingsForm } from "@/features/admin/settings/load-forms";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

export const dynamic = "force-dynamic";

export default async function AdminBrandingSettingsPage() {
  const admin = await requirePermission("branding.view");
  const { values, previewUrls } = await loadBrandingSettingsForm();
  const canUpdate = hasPermission(admin, "branding.update");

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
        Branding
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Branding
      </h1>
      <BrandingSettingsForm
        initialValues={values}
        initialPreviewUrls={previewUrls}
        canUpdate={canUpdate}
      />
    </div>
  );
}
