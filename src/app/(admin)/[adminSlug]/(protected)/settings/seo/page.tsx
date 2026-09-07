import Link from "next/link";
import { SeoSettingsForm } from "@/features/admin/settings/components/SeoSettingsForm";
import { loadSeoSettingsForm } from "@/features/admin/settings/load-forms";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";

export const dynamic = "force-dynamic";

export default async function AdminSeoSettingsPage() {
  const admin = await requirePermission("seo.view");
  const { values } = await loadSeoSettingsForm();
  const canUpdate = hasPermission(admin, "seo.update");

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
        SEO
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        SEO settings
      </h1>
      <SeoSettingsForm initialValues={values} canUpdate={canUpdate} />
    </div>
  );
}
