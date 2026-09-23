import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { requirePermission } from "@/features/auth/session";
import { PlatformUsageClient } from "@/features/platform-usage/components/PlatformUsageClient";
import { getSupabaseUsageSnapshot } from "@/features/platform-usage/supabase-usage-service";
import { getVercelUsageSnapshot } from "@/features/platform-usage/vercel-usage-service";

export const dynamic = "force-dynamic";

export default async function AdminPlatformUsagePage() {
  await requirePermission("settings.view");

  const [supabase, vercel] = await Promise.all([
    getSupabaseUsageSnapshot(),
    getVercelUsageSnapshot(),
  ]);

  return (
    <div className="space-y-4 pb-16">
      <AdminPageHeader
        title="Hosting & storage"
        description="See if Free / Hobby limits are getting full — Supabase files & database, Vercel traffic."
        breadcrumbs={[{ label: "Hosting & storage" }]}
      />
      <PlatformUsageClient supabase={supabase} vercel={vercel} />
    </div>
  );
}
