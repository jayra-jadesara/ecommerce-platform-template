"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { getAdminPath } from "@/config/admin-route";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import type { ErrorLogCounts } from "@/features/error-monitoring/queries";
import type {
  ErrorLogRow,
  ErrorLogTab,
  ErrorSeverity,
  ErrorStatus,
} from "@/features/error-monitoring/types";
import { cn } from "@/lib/cn";

function severityTone(
  severity: string,
): "error" | "warning" | "info" | "neutral" {
  if (severity === "CRITICAL") return "error";
  if (severity === "ERROR") return "error";
  if (severity === "WARNING") return "warning";
  if (severity === "INFO") return "info";
  return "neutral";
}

function statusTone(
  status: string,
): "success" | "warning" | "error" | "info" | "neutral" {
  if (status === "RESOLVED") return "success";
  if (status === "INVESTIGATING") return "info";
  if (status === "IGNORED") return "neutral";
  return "warning";
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminErrorLogsClient({
  items,
  total,
  page,
  pageSize,
  tab,
  counts,
  initialSearch,
  initialSeverity,
  initialStatus,
  paymentOnly,
  todayOnly,
}: {
  items: ErrorLogRow[];
  total: number;
  page: number;
  pageSize: number;
  tab: ErrorLogTab;
  counts: ErrorLogCounts;
  initialSearch: string;
  initialSeverity: ErrorSeverity | "ALL";
  initialStatus: ErrorStatus | "ALL";
  paymentOnly: boolean;
  todayOnly: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function pushParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "" || value === "ALL" || value === "false") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    if (!("page" in patch)) next.delete("page");
    startTransition(() => {
      router.push(`${getAdminPath("/error-logs")}?${next.toString()}`);
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-[color-mix(in_srgb,var(--color-warning)_14%,transparent)] px-3 py-1 font-medium">
          Open {counts.open}
        </span>
        <span className="rounded-full bg-[color-mix(in_srgb,var(--color-error)_14%,transparent)] px-3 py-1 font-medium">
          Critical {counts.critical}
        </span>
        <span className="rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] px-3 py-1 font-medium">
          Today {counts.today}
        </span>
        <span className="rounded-full bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] px-3 py-1 font-medium">
          Payment {counts.payment}
        </span>
      </div>

      <div
        role="tablist"
        aria-label="Error log categories"
        className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2"
      >
        {(
          [
            ["browser", "Page & Browser Errors"],
            ["server", "Database & Server Errors"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={cn(
              adminBtn(tab === id ? "primary" : "outline"),
              "!min-h-9",
            )}
            onClick={() => pushParams({ tab: id, page: null })}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Search</span>
          <input
            type="search"
            defaultValue={initialSearch}
            placeholder="Reference, message, route, login, order or payment ID"
            className="min-h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                pushParams({
                  q: (event.target as HTMLInputElement).value.trim() || null,
                });
              }
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", !paymentOnly && !todayOnly && initialSeverity === "ALL" && initialStatus === "ALL", () =>
                pushParams({
                  payment: null,
                  today: null,
                  severity: null,
                  status: null,
                })],
              ["Critical", initialSeverity === "CRITICAL", () =>
                pushParams({ severity: "CRITICAL" })],
              ["Open", initialStatus === "OPEN", () =>
                pushParams({ status: "OPEN" })],
              ["Payment", paymentOnly, () =>
                pushParams({ payment: paymentOnly ? null : "1" })],
              ["Today", todayOnly, () =>
                pushParams({ today: todayOnly ? null : "1" })],
            ] as const
          ).map(([label, active, onClick]) => (
            <button
              key={String(label)}
              type="button"
              className={cn(
                adminBtn(active ? "primary" : "outline"),
                "!min-h-8 !px-2.5 !text-xs",
              )}
              onClick={onClick}
            >
              {label === "all" ? "All" : label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn(pending && "opacity-60")}>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto rounded-xl border border-[var(--color-border)] md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2 font-semibold">Time</th>
                <th className="px-3 py-2 font-semibold">Severity</th>
                <th className="px-3 py-2 font-semibold">
                  {tab === "browser" ? "Page" : "Area"}
                </th>
                <th className="px-3 py-2 font-semibold">Error</th>
                <th className="px-3 py-2 font-semibold">
                  {tab === "browser" ? "Browser" : "Route"}
                </th>
                <th className="px-3 py-2 font-semibold">User</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-[var(--color-muted)]"
                  >
                    No errors match these filters.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[var(--color-border)] hover:bg-[color-mix(in_srgb,var(--color-primary)_4%,transparent)]"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                      {formatTime(row.last_seen_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      <AdminStatusBadge tone={severityTone(row.severity)}>
                        {row.severity}
                      </AdminStatusBadge>
                    </td>
                    <td className="max-w-[9rem] truncate px-3 py-2.5">
                      {tab === "browser"
                        ? row.page_name || row.route || "—"
                        : row.feature || row.error_type}
                    </td>
                    <td className="max-w-[16rem] truncate px-3 py-2.5">
                      <Link
                        href={getAdminPath(`/error-logs/${row.id}`)}
                        className="font-medium text-[var(--color-primary)] hover:underline"
                      >
                        {row.message}
                      </Link>
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2.5 text-xs text-[var(--color-muted)]">
                      {tab === "browser"
                        ? [row.browser_name, row.browser_version]
                            .filter(Boolean)
                            .join(" ") || "—"
                        : row.route || row.request_path || "—"}
                    </td>
                    <td className="max-w-[8rem] truncate px-3 py-2.5 text-xs">
                      {row.user_login || "Anonymous"}
                    </td>
                    <td className="px-3 py-2.5">
                      <AdminStatusBadge tone={statusTone(row.status)}>
                        {row.status}
                      </AdminStatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">
                      {row.reference_id}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {items.length === 0 ? (
            <p className="rounded-xl border border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
              No errors match these filters.
            </p>
          ) : (
            items.map((row) => (
              <Link
                key={row.id}
                href={getAdminPath(`/error-logs/${row.id}`)}
                className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <AdminStatusBadge tone={severityTone(row.severity)}>
                    {row.severity}
                  </AdminStatusBadge>
                  <span className="font-mono text-xs text-[var(--color-muted)]">
                    {row.reference_id}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium">
                  {row.message}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {formatTime(row.last_seen_at)} ·{" "}
                  {row.page_name || row.route || row.feature || row.error_type}
                </p>
                <div className="mt-2">
                  <AdminStatusBadge tone={statusTone(row.status)}>
                    {row.status}
                  </AdminStatusBadge>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            type="button"
            className={adminBtn("outline")}
            disabled={page <= 1}
            onClick={() => pushParams({ page: String(page - 1) })}
          >
            Previous
          </button>
          <span className="text-[var(--color-muted)]">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className={adminBtn("outline")}
            disabled={page >= totalPages}
            onClick={() => pushParams({ page: String(page + 1) })}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
