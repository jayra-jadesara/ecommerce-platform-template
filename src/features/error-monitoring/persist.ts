import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import type { ErrorLogRow, LogErrorInput, LogErrorResult } from "@/features/error-monitoring/types";
import {
  CUSTOMER_SAFE_MESSAGE,
  LIMITS,
} from "@/features/error-monitoring/types";
import {
  buildErrorFingerprint,
  generateErrorReferenceId,
} from "@/features/error-monitoring/reference";
import { pageNameFromRoute } from "@/features/error-monitoring/classify";
import {
  extractErrorMessage,
  extractErrorStack,
  parseStackLocation,
  sanitizeMetadata,
  sanitizeOptionalString,
  sanitizeStack,
  sanitizeString,
} from "@/features/error-monitoring/sanitize";

let loggingInProgress = false;

/**
 * Persist a sanitized error. Never throws to callers.
 * Groups by fingerprint for OPEN/INVESTIGATING rows.
 */
export async function persistErrorLog(
  input: LogErrorInput,
): Promise<LogErrorResult> {
  const fallbackRef = generateErrorReferenceId();
  if (loggingInProgress) {
    console.error("[error-monitoring] skipped nested log", input.message);
    return { referenceId: fallbackRef, id: null, grouped: false };
  }

  loggingInProgress = true;
  try {
    const message = sanitizeString(
      input.message || extractErrorMessage(input.error),
      LIMITS.message,
    );
    const stack =
      sanitizeStack(input.stack) ??
      sanitizeStack(extractErrorStack(input.error));
    const loc = parseStackLocation(stack);
    const fileName =
      sanitizeOptionalString(input.fileName, LIMITS.fileName) ?? loc.fileName;
    const lineNumber = input.lineNumber ?? loc.lineNumber;
    const columnNumber = input.columnNumber ?? loc.columnNumber;
    const functionName =
      sanitizeOptionalString(input.functionName, 200) ?? loc.functionName;
    const route = sanitizeOptionalString(input.route, LIMITS.route);
    const pageName =
      sanitizeOptionalString(input.pageName, LIMITS.pageName) ??
      pageNameFromRoute(route);
    const fingerprint = buildErrorFingerprint({
      type: input.type,
      source: input.source,
      operation: input.operation,
      route,
      message,
      fileName,
      lineNumber,
      functionName,
    });

    const supabase = createSupabaseServiceClient();

    if (!input.forceNew) {
      let existingQuery = supabase
        .from("error_logs")
        .select("id, reference_id, occurrence_count")
        .eq("fingerprint", fingerprint)
        .in("status", ["OPEN", "INVESTIGATING"])
        .order("last_seen_at", { ascending: false })
        .limit(1);

      if (input.storeId) {
        existingQuery = existingQuery.eq("store_id", input.storeId);
      } else {
        existingQuery = existingQuery.is("store_id", null);
      }

      const { data: existing } = await existingQuery.maybeSingle();
      if (existing) {
        const nextCount = (existing.occurrence_count ?? 1) + 1;
        await supabase
          .from("error_logs")
          .update({
            last_seen_at: new Date().toISOString(),
            occurrence_count: nextCount,
            message,
            stack,
            metadata_json: sanitizeMetadata(input.metadata) as Json,
          })
          .eq("id", existing.id);

        return {
          referenceId: existing.reference_id,
          id: existing.id,
          grouped: true,
        };
      }
    }

    const referenceId = generateErrorReferenceId();
    const row = {
      reference_id: referenceId,
      store_id: input.storeId ?? null,
      user_id: input.userId ?? null,
      user_login: sanitizeOptionalString(input.userLogin, LIMITS.userLogin),
      user_role: sanitizeOptionalString(input.userRole, 80),
      error_type: input.type,
      error_source: input.source,
      severity: input.severity ?? "ERROR",
      status: "OPEN" as const,
      message,
      safe_message: sanitizeString(
        input.safeMessage ?? CUSTOMER_SAFE_MESSAGE,
        500,
      ),
      stack,
      file_name: fileName,
      line_number: lineNumber,
      column_number: columnNumber,
      function_name: functionName,
      route,
      page_name: pageName,
      request_method: sanitizeOptionalString(input.requestMethod, 16),
      request_path: sanitizeOptionalString(input.requestPath, LIMITS.route),
      http_status: input.httpStatus ?? null,
      operation: sanitizeOptionalString(input.operation, LIMITS.operation),
      feature: sanitizeOptionalString(input.feature, LIMITS.feature),
      entity_type: sanitizeOptionalString(input.entityType, 80),
      entity_id: sanitizeOptionalString(input.entityId, 120),
      order_id: input.orderId ?? null,
      payment_id: input.paymentId ?? null,
      provider: sanitizeOptionalString(input.provider, 40),
      provider_order_id: sanitizeOptionalString(input.providerOrderId, 120),
      provider_payment_id: sanitizeOptionalString(input.providerPaymentId, 120),
      webhook_event_id: sanitizeOptionalString(input.webhookEventId, 120),
      error_code: sanitizeOptionalString(input.errorCode, LIMITS.errorCode),
      database_code: sanitizeOptionalString(input.databaseCode, 80),
      browser_name: sanitizeOptionalString(input.browserName, 80),
      browser_version: sanitizeOptionalString(input.browserVersion, 40),
      os: sanitizeOptionalString(input.os, 80),
      device_type: sanitizeOptionalString(input.deviceType, 40),
      user_agent: sanitizeOptionalString(input.userAgent, LIMITS.userAgent),
      metadata_json: sanitizeMetadata(input.metadata) as Json,
      fingerprint,
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      occurrence_count: 1,
    };

    const { data, error } = await supabase
      .from("error_logs")
      .insert(row)
      .select("id, reference_id")
      .single();

    if (error || !data) {
      console.error("[error-monitoring] persist failed", error?.message);
      return { referenceId, id: null, grouped: false };
    }

    return { referenceId: data.reference_id, id: data.id, grouped: false };
  } catch (err) {
    console.error(
      "[error-monitoring] persist exception",
      err instanceof Error ? err.message : err,
    );
    return { referenceId: fallbackRef, id: null, grouped: false };
  } finally {
    loggingInProgress = false;
  }
}

export type { ErrorLogRow };
