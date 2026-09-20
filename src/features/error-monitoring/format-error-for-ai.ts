import type { ErrorLogRow } from "@/features/error-monitoring/types";

/**
 * Plain-text error report for clipboard / sharing.
 */
export function formatErrorLogForAi(log: ErrorLogRow): string {
  const lines: string[] = [
    "Ecommerce platform error report",
    "",
    "## Error summary",
    `Reference: ${log.reference_id}`,
    `Severity: ${log.severity}`,
    `Status: ${log.status}`,
    `Type: ${log.error_type}`,
    `Source: ${log.error_source}`,
    `Occurrences: ${log.occurrence_count}`,
    `First seen: ${log.first_seen_at}`,
    `Last seen: ${log.last_seen_at}`,
    "",
    "## Message",
    log.message || "(none)",
  ];

  if (log.safe_message && log.safe_message !== log.message) {
    lines.push("", "## Safe message", log.safe_message);
  }

  lines.push(
    "",
    "## Location",
    `Page: ${log.page_name || "—"}`,
    `Route: ${log.route || log.request_path || "—"}`,
    `Feature: ${log.feature || "—"}`,
    `Operation: ${log.operation || "—"}`,
    `File: ${[log.file_name, log.line_number, log.column_number]
      .filter((v) => v != null && v !== "")
      .join(":") || "—"}`,
    `Function: ${log.function_name || "—"}`,
  );

  lines.push(
    "",
    "## Request",
    `Method: ${log.request_method || "—"}`,
    `Path: ${log.request_path || "—"}`,
    `HTTP status: ${log.http_status ?? "—"}`,
    `Error code: ${log.error_code || "—"}`,
    `Database code: ${log.database_code || "—"}`,
  );

  if (
    log.order_id ||
    log.payment_id ||
    log.provider ||
    log.provider_order_id ||
    log.provider_payment_id
  ) {
    lines.push(
      "",
      "## Payment / order",
      `Order ID: ${log.order_id || "—"}`,
      `Payment ID: ${log.payment_id || "—"}`,
      `Provider: ${log.provider || "—"}`,
      `Provider order: ${log.provider_order_id || "—"}`,
      `Provider payment: ${log.provider_payment_id || "—"}`,
      `Webhook event: ${log.webhook_event_id || "—"}`,
    );
  }

  lines.push(
    "",
    "## User / environment",
    `User: ${log.user_login || "Anonymous"}`,
    `Role: ${log.user_role || "—"}`,
    `Browser: ${[log.browser_name, log.browser_version].filter(Boolean).join(" ") || "—"}`,
    `OS: ${log.os || "—"}`,
    `Device: ${log.device_type || "—"}`,
    `User agent: ${log.user_agent || "—"}`,
  );

  lines.push(
    "",
    "## Stack trace",
    log.stack?.trim() || "(no stack trace captured)",
  );

  if (log.metadata_json && Object.keys(log.metadata_json).length > 0) {
    lines.push(
      "",
      "## Metadata (JSON)",
      JSON.stringify(log.metadata_json, null, 2),
    );
  }

  return lines.join("\n");
}
