import Link from "next/link";
import { ThemeEditorForm } from "@/features/admin/theme/components/ThemeEditorForm";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getStorefrontPlatformConfig } from "@/features/theme/service";
import { getAdminPath } from "@/config/admin-route";

export const dynamic = "force-dynamic";

export default async function AdminThemeSettingsPage() {
  const admin = await requirePermission("theme.view");
  const config = await getStorefrontPlatformConfig();
  const canUpdate = hasPermission(admin, "theme.update");

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
        Theme
      </p>
      <ThemeEditorForm
        initialTheme={config.theme}
        initialAnimation={config.animation}
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
