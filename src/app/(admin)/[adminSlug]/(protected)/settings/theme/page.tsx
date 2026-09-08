import Link from "next/link";
import { ThemeEditorForm } from "@/features/admin/theme/components/ThemeEditorForm";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getStorefrontPlatformConfig } from "@/features/theme/service";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminThemeSettingsPage() {
  const admin = await requirePermission("theme.view");
  const config = await getStorefrontPlatformConfig();
  const canUpdate = hasPermission(admin, "theme.update");
  const canLayout = hasPermission(admin, "settings.view");

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Appearance"
        description="Change your store colors, light/dark mode and visual style."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Appearance" },
        ]}
      />
      {canLayout ? (
        <p className="text-sm text-[var(--color-muted)]">
          Also customize{" "}
          <Link
            href={getAdminPath("/settings/header")}
            className="text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            Header layout
          </Link>{" "}
          and{" "}
          <Link
            href={getAdminPath("/settings/footer")}
            className="text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            Footer layout
          </Link>
          .
        </p>
      ) : null}
      <ThemeEditorForm
        initialTheme={config.theme}
        initialAnimation={config.animation}
        initialVisualEffects={config.visualEffects}
        brand={config.brand}
        fonts={{
          fontSans: config.typography.fontSans,
          fontDisplay: config.typography.fontDisplay,
        }}
        canUpdate={canUpdate}
      />
    </div>
  );
}
