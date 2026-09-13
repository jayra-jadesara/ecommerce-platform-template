import "server-only";

import { logError } from "@/features/error-monitoring/logger";
import type { ErrorSeverity } from "@/features/error-monitoring/types";

/** Persist storefront/admin auth failures into central error_logs. Never throws. */
export async function logAuthFailure(input: {
  operation: string;
  message: string;
  error?: unknown;
  severity?: ErrorSeverity;
  route?: string | null;
  userLogin?: string | null;
  errorCode?: string | null;
  httpStatus?: number | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await logError({
      type: "AUTH",
      source: "SERVER",
      severity: input.severity ?? "ERROR",
      message: input.message,
      error: input.error,
      operation: input.operation,
      feature: "AUTH",
      route: input.route ?? null,
      requestPath: input.route ?? null,
      userLogin: input.userLogin ?? null,
      errorCode: input.errorCode ?? null,
      httpStatus: input.httpStatus ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    // Never break auth UX if logging fails.
  }
}
