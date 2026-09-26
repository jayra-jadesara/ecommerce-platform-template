import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { hasAnyRole } from "@/features/auth/permissions";
import {
  getCurrentAdmin,
  requireAnyPermission,
} from "@/features/auth/session";
import { PlatformUsageClient } from "@/features/platform-usage/components/PlatformUsageClient";
import { getSupabaseUsageSnapshot } from "@/features/platform-usage/supabase-usage-service";
import { getVercelUsageSnapshot } from "@/features/platform-usage/vercel-usage-service";

export const dynamic = "force-dynamic";

export default async function AdminPlatformUsagePage() {
  await requireAnyPermission(["platform.view", "settings.view"]);

  const [supabase, vercel, admin] = await Promise.all([
    getSupabaseUsageSnapshot(),
    getVercelUsageSnapshot(),
    getCurrentAdmin(),
  ]);

  const canCleanup = Boolean(
    admin && hasAnyRole(admin.roles, ["SUPER_ADMIN"]),
  );

  return (
    <div className="space-y-4 pb-16">
      <AdminPageHeader
        title="Hosting & storage"
        description="Live Supabase usage vs capacity (space left), plus Vercel traffic limits."
        breadcrumbs={[{ label: "Hosting & storage" }]}
      />
      <PlatformUsageClient
        supabase={supabase}
        vercel={vercel}
        canCleanup={canCleanup}
      />
    </div>
  );
}
