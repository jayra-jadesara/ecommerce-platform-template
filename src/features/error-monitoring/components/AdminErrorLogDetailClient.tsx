"use client";

import { useState, type ReactNode } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { adminBtn, adminCard } from "@/features/admin/ui/admin-classes";
import { isPaymentRelated } from "@/features/error-monitoring/classify";
import { formatErrorLogForAi } from "@/features/error-monitoring/format-error-for-ai";
import type { ErrorLogRow } from "@/features/error-monitoring/types";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format-date";

function severityTone(
  severity: string,
): "error" | "warning" | "info" | "neutral" {
  if (severity === "CRITICAL" || severity === "ERROR") return "error";
  if (severity === "WARNING") return "warning";
  if (severity === "INFO") return "info";
  return "neutral";
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

type FactItem = { label: string; value: ReactNode };

function Fact({ label, value }: FactItem) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-0.5 break-words text-sm font-medium leading-snug text-[var(--color-foreground)]">
        {value}
      </p>
    </div>
  );
}

function FactPanel({ title, items }: { title: string; items: FactItem[] }) {
  const visible = items.filter((item) => hasValue(item.value));
  if (!visible.length) return null;

  return (
    <section className={cn(adminCard(), "overflow-hidden")}>
      <div className="border-b border-[var(--color-border)] px-3.5 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">
          {title}
        </h3>
      </div>
      <div className="grid gap-x-4 gap-y-3 p-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => (
          <Fact key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </section>
  );
}

export function AdminErrorLogDetailClient({ log }: { log: ErrorLogRow }) {
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedStack, setCopiedStack] = useState(false);
  const showPayment = isPaymentRelated(log);

  const location =
    log.page_name || log.route || log.request_path || log.feature || null;
  const fileLocation = [log.file_name, log.line_number, log.column_number]
    .filter((v) => v != null && v !== "")
    .join(":");
  const browser = [log.browser_name, log.browser_version]
    .filter(Boolean)
    .join(" ");
  const entity = [log.entity_type, log.entity_id].filter(Boolean).join(" · ");
  const requestLine =
    [log.request_method, log.request_path].filter(Boolean).join(" ") || null;

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(formatErrorLogForAi(log));
      setCopiedReport(true);
      window.setTimeout(() => setCopiedReport(false), 2000);
    } catch {
      setCopiedReport(false);
    }
  }

  async function copyStack() {
    if (!log.stack) return;
    try {
      await navigator.clipboard.writeText(log.stack);
      setCopiedStack(true);
      window.setTimeout(() => setCopiedStack(false), 1600);
    } catch {
      setCopiedStack(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className={cn(adminCard(), "overflow-hidden")}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-card))] px-3.5 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <AdminStatusBadge tone={severityTone(log.severity)}>
              {log.severity}
            </AdminStatusBadge>
            <span className="font-mono text-xs text-[var(--color-muted)]">
              {log.reference_id}
            </span>
            {log.occurrence_count > 1 ? (
              <span className="rounded-md bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-muted)]">
                ×{log.occurrence_count}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={copyReport}
            className={cn(
              adminBtn("primary"),
              "inline-flex !min-h-8 !items-center !gap-1.5 !px-3 !text-xs",
            )}
          >
            <ContentCopyIcon sx={{ fontSize: 14 }} />
            {copiedReport ? "Copied all" : "Copy all"}
          </button>
        </div>

        <div className="space-y-2 bg-[color-mix(in_srgb,var(--color-foreground)_4%,var(--color-card))] px-3.5 py-3">
          <h2 className="text-base font-semibold leading-snug tracking-tight text-[var(--color-foreground)] md:text-lg">
            {log.message}
          </h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
            <span>{formatDateTime(log.last_seen_at)}</span>
            {location ? (
              <span className="max-w-full truncate">{location}</span>
            ) : null}
            {log.error_type ? <span>{log.error_type}</span> : null}
            {log.error_source ? <span>{log.error_source}</span> : null}
          </div>
        </div>
      </div>

      <FactPanel
        title="What happened"
        items={[
          { label: "Last seen", value: formatDateTime(log.last_seen_at) },
          { label: "First seen", value: formatDateTime(log.first_seen_at) },
          { label: "Times seen", value: log.occurrence_count },
          { label: "Type", value: log.error_type },
          { label: "Source", value: log.error_source },
          { label: "Operation", value: log.operation },
          { label: "Feature", value: log.feature },
          { label: "Error code", value: log.error_code },
          { label: "Database code", value: log.database_code },
        ]}
      />

      <FactPanel
        title="Where"
        items={[
          { label: "Page", value: log.page_name },
          { label: "Route", value: log.route || log.request_path },
          { label: "Request", value: requestLine },
          { label: "HTTP status", value: log.http_status },
          { label: "File", value: fileLocation || null },
          { label: "Function", value: log.function_name },
          { label: "Entity", value: entity || null },
        ]}
      />

      <FactPanel
        title="Who"
        items={[
          { label: "User", value: log.user_login || "Anonymous" },
          { label: "Role", value: log.user_role },
          { label: "User ID", value: log.user_id },
          { label: "Browser", value: browser || null },
          { label: "OS", value: log.os },
          { label: "Device", value: log.device_type },
        ]}
      />

      {showPayment ? (
        <FactPanel
          title="Payment"
          items={[
            { label: "Provider", value: log.provider },
            { label: "Order", value: log.order_id },
            { label: "Payment", value: log.payment_id },
            { label: "Provider order", value: log.provider_order_id },
            { label: "Provider payment", value: log.provider_payment_id },
            { label: "Webhook", value: log.webhook_event_id },
          ]}
        />
      ) : null}

      <section className={cn(adminCard(), "overflow-hidden")}>
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-foreground)_4%,var(--color-card))] px-3.5 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">
            Stack trace
          </h3>
          <button
            type="button"
            disabled={!log.stack}
            onClick={copyStack}
            className={cn(
              adminBtn("outline"),
              "inline-flex !min-h-7 !items-center !gap-1 !px-2.5 !text-[11px] disabled:opacity-40",
            )}
          >
            <ContentCopyIcon sx={{ fontSize: 12 }} />
            {copiedStack ? "Copied" : "Copy"}
          </button>
        </div>
        <pre
          className={cn(
            "max-h-64 overflow-auto px-3.5 py-3 font-mono text-[11px] leading-relaxed",
            log.stack?.trim()
              ? "bg-[color-mix(in_srgb,var(--color-foreground)_92%,var(--color-card))] text-[color-mix(in_srgb,var(--color-card)_92%,white)]"
              : "bg-[color-mix(in_srgb,var(--color-foreground)_6%,var(--color-card))] text-[var(--color-muted)]",
          )}
        >
          {log.stack?.trim() || "No stack trace was captured for this error."}
        </pre>
      </section>
    </div>
  );
}
