import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { requirePermission } from "@/features/auth/session";
import { AdminErrorLogsClient } from "@/features/error-monitoring/components/AdminErrorLogsClient";
import {
  getErrorLogCounts,
  listErrorLogs,
} from "@/features/error-monitoring/queries";
import type {
  ErrorLogTab,
  ErrorSeverity,
  ErrorStatus,
} from "@/features/error-monitoring/types";

export const dynamic = "force-dynamic";

export default async function AdminErrorLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    q?: string;
    severity?: string;
    status?: string;
    payment?: string;
    today?: string;
  }>;
}) {
  await requirePermission("error_logs.view");
  const storeId = await resolveActiveStoreId();
  const params = await searchParams;
  const tab: ErrorLogTab = params.tab === "server" ? "server" : "browser";
  const page = Math.max(1, Number(params.page) || 1);
  const severity = (params.severity as ErrorSeverity | "ALL" | undefined) ?? "ALL";
  const status = (params.status as ErrorStatus | "ALL" | undefined) ?? "ALL";
  const paymentOnly = params.payment === "1";
  const todayOnly = params.today === "1";

  if (!storeId) {
    return (
      <div>
        <AdminPageHeader
          title="Error Logs"
          description="Review problems that occurred in your store and investigate what happened."
          breadcrumbs={[{ label: "Error Logs" }]}
        />
        <p className="text-sm text-[var(--color-muted)]">No active store found.</p>
      </div>
    );
  }

  const [result, counts] = await Promise.all([
    listErrorLogs({
      storeId,
      tab,
      page,
      pageSize: 20,
      q: params.q ?? "",
      severity,
      status,
      paymentOnly,
      todayOnly,
    }),
    getErrorLogCounts(storeId),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Error Logs"
        description="Review problems that occurred in your store and investigate what happened."
        breadcrumbs={[{ label: "Error Logs" }]}
      />
      <AdminErrorLogsClient
        items={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        tab={tab}
        counts={counts}
        initialSearch={params.q ?? ""}
        initialSeverity={severity}
        initialStatus={status}
        paymentOnly={paymentOnly}
        todayOnly={todayOnly}
      />
    </div>
  );
}
