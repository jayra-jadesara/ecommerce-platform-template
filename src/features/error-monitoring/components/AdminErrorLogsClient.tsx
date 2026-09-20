"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { getAdminPath } from "@/config/admin-route";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { adminBtn, adminCard } from "@/features/admin/ui/admin-classes";
import { formatErrorLogForAi } from "@/features/error-monitoring/format-error-for-ai";
import type { ErrorLogCounts } from "@/features/error-monitoring/queries";
import type {
  ErrorLogRow,
  ErrorLogTab,
  ErrorSeverity,
  ErrorStatus,
} from "@/features/error-monitoring/types";
import { ERROR_SEVERITIES } from "@/features/error-monitoring/types";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format-date";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
] as const;

function severityTone(
  severity: string,
): "error" | "warning" | "info" | "neutral" {
  if (severity === "CRITICAL" || severity === "ERROR") return "error";
  if (severity === "WARNING") return "warning";
  if (severity === "INFO") return "info";
  return "neutral";
}

function buildPageItems(
  current: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
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
  const [search, setSearch] = useState(initialSearch);
  const [severity, setSeverity] = useState(initialSeverity);
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );

  const severityOptions = useMemo(
    () => [
      { value: "ALL", label: "All severities" },
      ...ERROR_SEVERITIES.map((value) => ({ value, label: value })),
    ],
    [],
  );

  function applyFilters(options?: {
    page?: number;
    search?: string;
    pageSize?: number;
    tab?: ErrorLogTab;
    severity?: string;
    status?: string;
    payment?: boolean;
    today?: boolean;
  }) {
    const nextPage = options?.page ?? 1;
    const nextSearch = (options?.search ?? search).trim();
    const nextPageSize = options?.pageSize ?? pageSize;
    const nextTab = options?.tab ?? tab;
    const nextSeverity = options?.severity ?? severity;
    const nextStatus = options?.status ?? status;
    const nextPayment = options?.payment ?? paymentOnly;
    const nextToday = options?.today ?? todayOnly;

    const params = new URLSearchParams();
    if (nextTab !== "browser") params.set("tab", nextTab);
    if (nextSearch) params.set("q", nextSearch);
    if (nextSeverity && nextSeverity !== "ALL") {
      params.set("severity", nextSeverity);
    }
    if (nextStatus && nextStatus !== "ALL") {
      params.set("status", nextStatus);
    }
    if (nextPayment) params.set("payment", "1");
    if (nextToday) params.set("today", "1");
    if (nextPageSize !== 10) params.set("pageSize", String(nextPageSize));
    if (nextPage > 1) params.set("page", String(nextPage));

    const qs = params.toString();
    startTransition(() => {
      router.push(getAdminPath(`/error-logs${qs ? `?${qs}` : ""}`));
    });
  }

  function commitSearch() {
    const next = search.trim();
    if (next === initialSearch.trim()) return;
    applyFilters({ search: next });
  }

  function clearFilters() {
    setSearch("");
    setSeverity("ALL");
    setStatus("ALL");
    applyFilters({
      search: "",
      severity: "ALL",
      status: "ALL",
      payment: false,
      today: false,
    });
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(initialSearch.trim()) ||
    severity !== "ALL" ||
    status !== "ALL" ||
    paymentOnly ||
    todayOnly;

  async function copyDetails(row: ErrorLogRow) {
    try {
      await navigator.clipboard.writeText(formatErrorLogForAi(row));
      setCopiedId(row.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setCopiedId(null);
    }
  }

  const scopeFilters = [
    {
      id: "open",
      label: "Open",
      count: counts.open,
      active: status === "OPEN",
      onClick: () => {
        const next = status === "OPEN" ? "ALL" : "OPEN";
        setStatus(next);
        applyFilters({ status: next });
      },
    },
    {
      id: "critical",
      label: "Critical",
      count: counts.critical,
      active: severity === "CRITICAL",
      onClick: () => {
        const next = severity === "CRITICAL" ? "ALL" : "CRITICAL";
        setSeverity(next);
        applyFilters({ severity: next });
      },
    },
    {
      id: "today",
      label: "Today",
      count: counts.today,
      active: todayOnly,
      onClick: () => applyFilters({ today: !todayOnly }),
    },
    {
      id: "payment",
      label: "Payment",
      count: counts.payment,
      active: paymentOnly,
      onClick: () => applyFilters({ payment: !paymentOnly }),
    },
  ] as const;

  return (
    <div className="space-y-2.5">
      {/* Toolbar: scope + quick counts */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-0.5">
          {(["browser", "server"] as const).map((id) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                disabled={pending}
                onClick={() => applyFilters({ tab: id })}
                className={cn(
                  "rounded-[10px] px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                  active
                    ? "bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                {id}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {scopeFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={pending}
              onClick={item.onClick}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                item.active
                  ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "tabular-nums",
                  item.active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-foreground)]",
                )}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search + severity */}
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10.5rem]">
        <TextField
          size="small"
          fullWidth
          label="Search"
          placeholder="Reference, message, page, user…"
          value={search}
          disabled={pending}
          onChange={(event) => setSearch(event.target.value)}
          onBlur={commitSearch}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitSearch();
            }
          }}
          slotProps={{
            input: {
              endAdornment: hasActiveFilters ? (
                <InputAdornment position="end">
                  <IconButton
                    type="button"
                    size="small"
                    edge="end"
                    aria-label="Clear filters"
                    disabled={pending}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={clearFilters}
                    sx={{
                      color: "var(--color-muted)",
                      "&:hover": { color: "var(--color-foreground)" },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        <AdminSelect
          label="Severity"
          value={severity}
          disabled={pending}
          options={severityOptions}
          onChange={(next) => {
            setSeverity(next as ErrorSeverity | "ALL");
            applyFilters({ severity: next });
          }}
        />
      </div>

      {/* Count + pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--color-muted)]">
          {total === 0 ? (
            <>0 errors</>
          ) : (
            <>
              <span className="font-semibold text-[var(--color-foreground)]">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {total}
              </span>
              <span className="mx-1.5 text-[var(--color-muted)]">|</span>
              Page{" "}
              <span className="font-semibold text-[var(--color-foreground)]">
                {page}
              </span>
              /
              <span className="font-semibold text-[var(--color-foreground)]">
                {totalPages}
              </span>
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {total > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                disabled={page <= 1 || pending}
                onClick={() => applyFilters({ page: page - 1 })}
                className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs font-medium disabled:opacity-40"
              >
                Prev
              </button>
              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-xs text-[var(--color-muted)]"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    disabled={pending || item === page}
                    onClick={() => applyFilters({ page: item })}
                    className={cn(
                      "h-8 min-w-8 rounded-lg border px-2 text-xs font-medium transition-colors disabled:opacity-100",
                      item === page
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-button-foreground)]"
                        : "border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)] disabled:opacity-40",
                    )}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={page >= totalPages || pending}
                onClick={() => applyFilters({ page: page + 1 })}
                className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}

          <div className="w-[6.75rem]">
            <AdminSelect
              label="Rows"
              value={String(pageSize)}
              disabled={pending}
              fullWidth
              options={PAGE_SIZE_OPTIONS}
              onChange={(value) => {
                const next = value === "25" ? 25 : 10;
                applyFilters({ pageSize: next, page: 1 });
              }}
            />
          </div>
        </div>
      </div>

      {!items.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center">
          <p className="text-sm font-semibold">No errors match</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Try a different search or clear filters.
          </p>
        </div>
      ) : (
        <div className={cn(adminCard(), "overflow-x-auto")}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Error</th>
                <th className="px-4 py-3 font-medium">
                  {tab === "browser" ? "Page" : "Area"}
                </th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">
                  {tab === "browser" ? "Browser" : "Route"}
                </th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)]"
                >
                  <td className="px-4 py-3">
                    <p className="max-w-[22rem] truncate font-semibold">
                      {row.message}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--color-muted)]">
                      {row.reference_id}
                      {row.occurrence_count > 1
                        ? ` · ×${row.occurrence_count}`
                        : ""}
                    </p>
                    <p className="mt-0.5 whitespace-nowrap text-xs text-[var(--color-muted)]">
                      {formatDateTime(row.last_seen_at)}
                    </p>
                  </td>
                  <td className="max-w-[9rem] truncate px-4 py-3 text-[var(--color-muted)]">
                    {tab === "browser"
                      ? row.page_name || row.route || "—"
                      : row.feature || row.error_type}
                  </td>
                  <td className="px-4 py-3">
                    <AdminStatusBadge tone={severityTone(row.severity)}>
                      {row.severity}
                    </AdminStatusBadge>
                  </td>
                  <td className="max-w-[9rem] truncate px-4 py-3 text-xs text-[var(--color-muted)]">
                    {tab === "browser"
                      ? [row.browser_name, row.browser_version]
                          .filter(Boolean)
                          .join(" ") || "—"
                      : row.route || row.request_path || "—"}
                  </td>
                  <td className="max-w-[8rem] truncate px-4 py-3 text-xs">
                    {row.user_login || "Anonymous"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={getAdminPath(`/error-logs/${row.id}`)}
                        className={cn(adminBtn("ghost"), "!min-h-9 !px-3 !text-xs")}
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyDetails(row)}
                        className={cn(
                          adminBtn("outline"),
                          "!min-h-9 !gap-1 !px-3 !text-xs inline-flex items-center",
                        )}
                      >
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                        {copiedId === row.id ? "Copied" : "Copy all"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
