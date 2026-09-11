"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateErrorLogStatusAction } from "@/features/error-monitoring/actions";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { isPaymentRelated } from "@/features/error-monitoring/classify";
import type { ErrorLogRow, ErrorStatus } from "@/features/error-monitoring/types";
import { cn } from "@/lib/cn";

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {title}
        <span className="text-[var(--color-muted)]">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-[var(--color-border)] px-4 py-3 text-sm">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr]">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="break-words font-medium">{value || "—"}</dd>
    </div>
  );
}

export function AdminErrorLogDetailClient({
  log,
  canUpdate,
}: {
  log: ErrorLogRow;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState(log.admin_note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const showPayment = isPaymentRelated(log);

  function setStatus(status: ErrorStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateErrorLogStatusAction({
        id: log.id,
        status,
        adminNote: note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function copyStack() {
    if (!log.stack) return;
    try {
      await navigator.clipboard.writeText(log.stack);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AdminStatusBadge
          tone={
            log.severity === "CRITICAL" || log.severity === "ERROR"
              ? "error"
              : log.severity === "WARNING"
                ? "warning"
                : "info"
          }
        >
          {log.severity}
        </AdminStatusBadge>
        <AdminStatusBadge
          tone={
            log.status === "RESOLVED"
              ? "success"
              : log.status === "INVESTIGATING"
                ? "info"
                : "warning"
          }
        >
          {log.status}
        </AdminStatusBadge>
        <span className="font-mono text-sm">{log.reference_id}</span>
        {log.occurrence_count > 1 ? (
          <span className="text-xs text-[var(--color-muted)]">
            ×{log.occurrence_count} occurrences
          </span>
        ) : null}
      </div>

      <p className="text-base font-semibold">{log.message}</p>
      <p className="text-sm text-[var(--color-muted)]">{log.safe_message}</p>

      {canUpdate ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm font-semibold">Resolution</p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-muted)]">Admin note (optional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={adminBtn("outline")}
              disabled={pending}
              onClick={() => setStatus("INVESTIGATING")}
            >
              Mark Investigating
            </button>
            <button
              type="button"
              className={adminBtn("primary")}
              disabled={pending}
              onClick={() => setStatus("RESOLVED")}
            >
              Mark Resolved
            </button>
            <button
              type="button"
              className={adminBtn("outline")}
              disabled={pending}
              onClick={() => setStatus("IGNORED")}
            >
              Mark Ignored
            </button>
          </div>
          {error ? (
            <p className="text-sm text-[var(--color-error)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      <Section title="Overview">
        <Row label="Time" value={new Date(log.last_seen_at).toLocaleString()} />
        <Row label="Type" value={log.error_type} />
        <Row label="Source" value={log.error_source} />
        <Row label="Operation" value={log.operation} />
        <Row label="Feature" value={log.feature} />
        <Row label="Error code" value={log.error_code} />
      </Section>

      <Section title="Context">
        <Row label="Page" value={log.page_name} />
        <Row label="Route" value={log.route || log.request_path} />
        <Row label="Store" value={log.store_id} />
        <Row label="Entity" value={[log.entity_type, log.entity_id].filter(Boolean).join(" · ")} />
      </Section>

      <Section title="User">
        <Row label="User ID" value={log.user_id} />
        <Row label="Login" value={log.user_login || "Anonymous"} />
        <Row label="Role" value={log.user_role} />
      </Section>

      {showPayment ? (
        <Section title="Payment Details" defaultOpen>
          <Row label="Provider" value={log.provider} />
          <Row label="Internal order" value={log.order_id} />
          <Row label="Internal payment" value={log.payment_id} />
          <Row label="Provider order" value={log.provider_order_id} />
          <Row label="Provider payment" value={log.provider_payment_id} />
          <Row label="Webhook event" value={log.webhook_event_id} />
          <Row label="Operation" value={log.operation} />
        </Section>
      ) : null}

      <Section title="Request">
        <Row label="Method" value={log.request_method} />
        <Row label="Path" value={log.request_path} />
        <Row label="HTTP status" value={log.http_status} />
        <Row label="Database code" value={log.database_code} />
      </Section>

      <Section title="Environment">
        <Row
          label="Browser"
          value={[log.browser_name, log.browser_version].filter(Boolean).join(" ")}
        />
        <Row label="OS" value={log.os} />
        <Row label="Device" value={log.device_type} />
        <Row label="User agent" value={log.user_agent} />
      </Section>

      <Section title="Occurrences">
        <Row label="First seen" value={new Date(log.first_seen_at).toLocaleString()} />
        <Row label="Last seen" value={new Date(log.last_seen_at).toLocaleString()} />
        <Row label="Count" value={log.occurrence_count} />
        <Row label="Fingerprint" value={log.fingerprint} />
      </Section>

      <Section title="Technical Details" defaultOpen={false}>
        <Row label="File" value={log.file_name} />
        <Row label="Line" value={log.line_number} />
        <Row label="Column" value={log.column_number} />
        <Row label="Function" value={log.function_name} />
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[var(--color-muted)]">Stack trace</p>
            <button
              type="button"
              className={cn(adminBtn("outline"), "!min-h-8 !px-2.5 !text-xs")}
              onClick={copyStack}
              disabled={!log.stack}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="max-h-80 overflow-auto rounded-lg bg-[color-mix(in_srgb,var(--color-foreground)_6%,var(--color-background))] p-3 font-mono text-xs leading-relaxed text-[var(--color-foreground)]">
            {log.stack || "No stack trace captured."}
          </pre>
        </div>
      </Section>
    </div>
  );
}
