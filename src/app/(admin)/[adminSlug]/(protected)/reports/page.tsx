import { requirePermission } from "@/features/auth/session";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminReportsClient } from "@/features/admin/reports/AdminReportsClient";
import { isManagementReportKey } from "@/features/admin/reports/build-report-pdf";
import { getAdminReportBundle } from "@/features/admin/reports/queries";
import {
  DEFAULT_REPORT_RANGE,
  isReportRangeKey,
} from "@/features/admin/reports/report-range";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { adminPageStack } from "@/features/admin/ui/admin-classes";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("dashboard.view");
  const storeId = await resolveActiveStoreId();
  const sp = await searchParams;

  const rangeRaw =
    typeof sp.range === "string" ? sp.range : DEFAULT_REPORT_RANGE;
  const range = isReportRangeKey(rangeRaw) ? rangeRaw : DEFAULT_REPORT_RANGE;

  const reportRaw = typeof sp.report === "string" ? sp.report : "";
  const report = isManagementReportKey(reportRaw) ? reportRaw : "";

  const from = typeof sp.from === "string" ? sp.from : null;
  const to = typeof sp.to === "string" ? sp.to : null;

  const bundle = await getAdminReportBundle(storeId, { range, from, to });

  return (
    <div className={adminPageStack()}>
      <AdminPageHeader
        title="Reports"
        description="Pick a management report and period — preview in the viewer, then download to your device."
        breadcrumbs={[{ label: "Reports" }]}
      />
      <AdminReportsClient bundle={bundle} range={range} report={report} />
    </div>
  );
}
