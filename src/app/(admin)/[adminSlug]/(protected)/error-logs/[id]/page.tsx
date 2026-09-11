import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getAdminPath } from "@/config/admin-route";
import { hasPermission, requirePermission } from "@/features/auth/session";
import { AdminErrorLogDetailClient } from "@/features/error-monitoring/components/AdminErrorLogDetailClient";
import { getErrorLogById } from "@/features/error-monitoring/queries";

export const dynamic = "force-dynamic";

export default async function AdminErrorLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requirePermission("error_logs.view");
  const storeId = await resolveActiveStoreId();
  const { id } = await params;
  if (!storeId) notFound();

  const log = await getErrorLogById({ storeId, id });
  if (!log) notFound();

  return (
    <div>
      <AdminPageHeader
        title={log.reference_id}
        description="Investigate this error and update its status."
        breadcrumbs={[
          { label: "Error Logs", href: getAdminPath("/error-logs") },
          { label: log.reference_id },
        ]}
        actions={
          <Link
            href={getAdminPath("/error-logs")}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Back to list
          </Link>
        }
      />
      <AdminErrorLogDetailClient
        log={log}
        canUpdate={hasPermission(admin, "error_logs.update")}
      />
    </div>
  );
}
