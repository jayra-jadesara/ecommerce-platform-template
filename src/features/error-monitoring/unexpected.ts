import "server-only";

import {
  customerFacingError,
  logError,
} from "@/features/error-monitoring/logger";
import type {
  ErrorSeverity,
  ErrorSource,
  ErrorType,
  LogErrorInput,
} from "@/features/error-monitoring/types";

export type SafeFailure = {
  ok: false;
  error: string;
  referenceId: string;
};

/**
 * Log an unexpected server/database/storage failure once and return a
 * customer/admin-safe `{ ok: false, error, referenceId }` payload.
 * Never throws.
 */
export async function unexpectedFailure(
  input: {
    type: ErrorType;
    source?: ErrorSource;
    severity?: ErrorSeverity;
    operation: string;
    feature: string;
    message?: string;
    error?: unknown;
    entityType?: string | null;
    entityId?: string | null;
    storeId?: string | null;
    route?: string | null;
    databaseCode?: string | null;
    metadata?: Record<string, unknown> | null;
  } & Partial<
    Pick<
      LogErrorInput,
      | "orderId"
      | "paymentId"
      | "provider"
      | "requestMethod"
      | "requestPath"
      | "httpStatus"
    >
  >,
): Promise<SafeFailure> {
  const message =
    input.message ||
    (input.error instanceof Error
      ? input.error.message
      : typeof input.error === "object" &&
          input.error &&
          "message" in input.error
        ? String((input.error as { message: unknown }).message)
        : "Unexpected server failure");

  const dbCode =
    input.databaseCode ??
    (typeof input.error === "object" &&
    input.error &&
    "code" in input.error &&
    typeof (input.error as { code: unknown }).code === "string"
      ? (input.error as { code: string }).code
      : null);

  const logged = await logError({
    type: input.type,
    source: input.source ?? "SERVER",
    severity: input.severity ?? "ERROR",
    message,
    error: input.error,
    operation: input.operation,
    feature: input.feature,
    entityType: input.entityType,
    entityId: input.entityId,
    storeId: input.storeId,
    route: input.route,
    databaseCode: dbCode,
    metadata: input.metadata,
    orderId: input.orderId,
    paymentId: input.paymentId,
    provider: input.provider,
    requestMethod: input.requestMethod,
    requestPath: input.requestPath,
    httpStatus: input.httpStatus,
  });

  return {
    ok: false,
    ...customerFacingError(logged.referenceId, false),
    referenceId: logged.referenceId,
  };
}

/** Next.js `redirect()` / `notFound()` must propagate uncaught. */
function isNextNavigationError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (error as { digest: string }).digest.startsWith("NEXT_NOT_FOUND")),
  );
}

/**
 * Run a mutation and log only unexpected thrown exceptions.
 * Expected `{ ok: false }` business results pass through unchanged.
 */
export async function runLoggedMutation<T>(
  context: {
    type: ErrorType;
    source?: ErrorSource;
    severity?: ErrorSeverity;
    operation: string;
    feature: string;
    entityType?: string | null;
    entityId?: string | null;
    storeId?: string | null;
    route?: string | null;
  },
  fn: () => Promise<T>,
): Promise<T | SafeFailure> {
  try {
    return await fn();
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    return unexpectedFailure({
      ...context,
      error,
      message:
        error instanceof Error ? error.message : "Unexpected runtime failure",
    });
  }
}

/** True when a PostgREST/Supabase-style error object is present. */
export function isDbError(
  error: unknown,
): error is { message: string; code?: string } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string",
  );
}
